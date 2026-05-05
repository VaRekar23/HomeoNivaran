import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Numeric, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class MedicineInventory(Base):
    __tablename__ = "medicine_inventory"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    medicine_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )
    medicine_category: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    potency: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
        # e.g. 30C, 200C, 1M
    )
    quantity_in_stock: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
        # Number of units in stock
    )
    unit: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="units"
        # e.g. "units", "bottles", "tubes"
    )
    reorder_level: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=10
        # Alert when stock falls below this
    )
    cost_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0
        # What doctor pays for it
    )
    selling_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0
        # What patient pays
    )
    supplier: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Track all stock movements
    movements: Mapped[list["InventoryMovement"]] = relationship(
        "InventoryMovement",
        back_populates="medicine",
        cascade="all, delete-orphan",
        order_by="InventoryMovement.created_at.desc()"
    )


class InventoryMovement(Base):
    """
    Every stock change is recorded here.
    Provides full audit trail of inventory movements.
    """
    __tablename__ = "inventory_movements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    medicine_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medicine_inventory.id", ondelete="CASCADE"),
        nullable=False
    )
    movement_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False
        # "stock_in" | "stock_out" | "adjustment" | "dispensed"
    )
    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
        # Positive = added, Negative = removed
    )
    quantity_before: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    quantity_after: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
        # e.g. "Monthly restock", "Dispensed for order #123"
    )
    reference_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True
        # e.g. order_id when dispensed
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    medicine: Mapped["MedicineInventory"] = relationship(
        "MedicineInventory",
        back_populates="movements"
    )