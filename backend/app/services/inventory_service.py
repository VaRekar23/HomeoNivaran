import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from fastapi import HTTPException, status
from pydantic import BaseModel
from typing import Optional

from app.models.inventory import MedicineInventory, InventoryMovement

logger = logging.getLogger(__name__)


class InventoryCreate(BaseModel):
    medicine_name:     str
    medicine_category: str
    potency:           Optional[str] = None
    quantity_in_stock: int = 0
    unit:              str = "units"
    reorder_level:     int = 10
    cost_price:        float = 0
    selling_price:     float = 0
    supplier:          Optional[str] = None
    notes:             Optional[str] = None


class InventoryUpdate(BaseModel):
    medicine_name:     Optional[str] = None
    medicine_category: Optional[str] = None
    potency:           Optional[str] = None
    unit:              Optional[str] = None
    reorder_level:     Optional[int] = None
    cost_price:        Optional[float] = None
    selling_price:     Optional[float] = None
    supplier:          Optional[str] = None
    notes:             Optional[str] = None
    is_active:         Optional[bool] = None


class StockAdjustment(BaseModel):
    quantity:      int
    # Positive = add stock, Negative = remove stock
    movement_type: str = "adjustment"
    # "stock_in" | "stock_out" | "adjustment"
    reason:        Optional[str] = None


def _item_to_dict(item: MedicineInventory) -> dict:
    return {
        "id":                str(item.id),
        "medicine_name":     item.medicine_name,
        "medicine_category": item.medicine_category,
        "potency":           item.potency,
        "quantity_in_stock": item.quantity_in_stock,
        "unit":              item.unit,
        "reorder_level":     item.reorder_level,
        "is_low_stock":      item.quantity_in_stock <= item.reorder_level,
        "cost_price":        float(item.cost_price),
        "selling_price":     float(item.selling_price),
        "supplier":          item.supplier,
        "notes":             item.notes,
        "is_active":         item.is_active,
        "created_at":        item.created_at,
        "updated_at":        item.updated_at,
    }


async def get_all_inventory(
    db: AsyncSession,
    include_inactive: bool = False,
    low_stock_only:   bool = False,
    category:         Optional[str] = None,
) -> list[dict]:
    query = select(MedicineInventory)

    conditions = []
    if not include_inactive:
        conditions.append(MedicineInventory.is_active == True)
    if category:
        conditions.append(MedicineInventory.medicine_category == category)
    if low_stock_only:
        conditions.append(
            MedicineInventory.quantity_in_stock <=
            MedicineInventory.reorder_level
        )
    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(
        MedicineInventory.medicine_category.asc(),
        MedicineInventory.medicine_name.asc()
    )

    result = await db.execute(query)
    items = result.scalars().all()
    return [_item_to_dict(i) for i in items]


async def get_inventory_stats(db: AsyncSession) -> dict:
    """Returns summary stats for the inventory dashboard."""

    total = await db.scalar(
        select(func.count(MedicineInventory.id)).where(
            MedicineInventory.is_active == True
        )
    ) or 0

    low_stock = await db.scalar(
        select(func.count(MedicineInventory.id)).where(
            MedicineInventory.is_active == True,
            MedicineInventory.quantity_in_stock <=
            MedicineInventory.reorder_level
        )
    ) or 0

    out_of_stock = await db.scalar(
        select(func.count(MedicineInventory.id)).where(
            MedicineInventory.is_active == True,
            MedicineInventory.quantity_in_stock == 0
        )
    ) or 0

    total_value = await db.scalar(
        select(
            func.sum(
                MedicineInventory.quantity_in_stock *
                MedicineInventory.cost_price
            )
        ).where(MedicineInventory.is_active == True)
    ) or 0

    return {
        "total_medicines": total,
        "low_stock_count": low_stock,
        "out_of_stock_count": out_of_stock,
        "total_inventory_value": float(total_value),
    }


async def create_inventory_item(
    db: AsyncSession,
    created_by: uuid.UUID,
    data: InventoryCreate
) -> dict:
    item = MedicineInventory(
        medicine_name=data.medicine_name,
        medicine_category=data.medicine_category,
        potency=data.potency,
        quantity_in_stock=data.quantity_in_stock,
        unit=data.unit,
        reorder_level=data.reorder_level,
        cost_price=data.cost_price,
        selling_price=data.selling_price,
        supplier=data.supplier,
        notes=data.notes,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)

    # Record initial stock as a movement
    if data.quantity_in_stock > 0:
        movement = InventoryMovement(
            medicine_id=item.id,
            movement_type="stock_in",
            quantity=data.quantity_in_stock,
            quantity_before=0,
            quantity_after=data.quantity_in_stock,
            reason="Initial stock",
            created_by=created_by,
        )
        db.add(movement)
        await db.flush()

    logger.info(
        f"Inventory item created: {item.medicine_name} "
        f"({item.potency}) - qty: {item.quantity_in_stock}"
    )
    return _item_to_dict(item)


async def update_inventory_item(
    db: AsyncSession,
    item_id: uuid.UUID,
    data: InventoryUpdate
) -> dict:
    result = await db.execute(
        select(MedicineInventory).where(MedicineInventory.id == item_id)
    )
    item = result.scalar_one_or_none()

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.flush()
    await db.refresh(item)
    return _item_to_dict(item)


async def adjust_stock(
    db: AsyncSession,
    item_id: uuid.UUID,
    adjusted_by: uuid.UUID,
    data: StockAdjustment
) -> dict:
    """
    Adjust stock quantity up or down.
    Records movement for audit trail.
    """
    result = await db.execute(
        select(MedicineInventory).where(MedicineInventory.id == item_id)
    )
    item = result.scalar_one_or_none()

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )

    new_quantity = item.quantity_in_stock + data.quantity
    if new_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reduce stock below 0. "
                   f"Current stock: {item.quantity_in_stock}"
        )

    quantity_before = item.quantity_in_stock
    item.quantity_in_stock = new_quantity
    await db.flush()

    movement = InventoryMovement(
        medicine_id=item_id,
        movement_type=data.movement_type,
        quantity=data.quantity,
        quantity_before=quantity_before,
        quantity_after=new_quantity,
        reason=data.reason,
        created_by=adjusted_by,
    )
    db.add(movement)
    await db.flush()

    # Send low stock Telegram alert if needed
    if new_quantity <= item.reorder_level and quantity_before > item.reorder_level:
        from app.services.telegram_service import send_telegram_alert
        await send_telegram_alert(
            f"⚠️ <b>Low Stock Alert — HomeoNivaran</b>\n\n"
            f"💊 <b>{item.medicine_name}</b>"
            f"{f' ({item.potency})' if item.potency else ''}\n"
            f"📦 Stock: <b>{new_quantity} {item.unit}</b>\n"
            f"🔔 Reorder level: {item.reorder_level}\n\n"
            f"Please restock soon."
        )

    return {
        **_item_to_dict(item),
        "movement": {
            "quantity_change": data.quantity,
            "quantity_before": quantity_before,
            "quantity_after":  new_quantity,
            "reason":          data.reason,
        }
    }


async def get_stock_movements(
    db: AsyncSession,
    item_id: uuid.UUID,
    limit: int = 20
) -> list[dict]:
    result = await db.execute(
        select(InventoryMovement).where(
            InventoryMovement.medicine_id == item_id
        ).order_by(
            InventoryMovement.created_at.desc()
        ).limit(limit)
    )
    movements = result.scalars().all()
    return [
        {
            "id":              str(m.id),
            "movement_type":   m.movement_type,
            "quantity":        m.quantity,
            "quantity_before": m.quantity_before,
            "quantity_after":  m.quantity_after,
            "reason":          m.reason,
            "created_at":      m.created_at,
        }
        for m in movements
    ]


async def deduct_stock_for_order(
    db: AsyncSession,
    order_id: uuid.UUID,
    medicines: list[dict],
    # [{"medicine_name": "...", "potency": "..."}]
) -> None:
    """
    Called when an order is dispatched.
    Attempts to deduct stock for each medicine in the prescription.
    Logs if medicine not found in inventory (not a hard error).
    """
    for med in medicines:
        result = await db.execute(
            select(MedicineInventory).where(
                MedicineInventory.medicine_name.ilike(
                    med.get("medicine_name", "")
                ),
                MedicineInventory.is_active == True
            ).limit(1)
        )
        item = result.scalar_one_or_none()

        if item and item.quantity_in_stock > 0:
            await adjust_stock(
                db=db,
                item_id=item.id,
                adjusted_by=None,
                data=StockAdjustment(
                    quantity=-1,
                    movement_type="dispensed",
                    reason=f"Dispensed for order {str(order_id)[:8]}"
                )
            )
        elif item:
            logger.warning(
                f"Medicine '{med.get('medicine_name')}' "
                f"is out of stock. Order {order_id}"
            )