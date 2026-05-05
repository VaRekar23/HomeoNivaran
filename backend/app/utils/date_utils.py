from datetime import date


def compute_age(dob: date) -> int:
    """
    Computes age in completed years from date of birth.
    Returns 0 if dob is None.
    """
    if not dob:
        return 0
    today = date.today()
    years = today.year - dob.year
    # Subtract 1 if birthday hasn't occurred yet this year
    if (today.month, today.day) < (dob.month, dob.day):
        years -= 1
    return max(0, years)