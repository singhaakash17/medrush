def to_paise(inr: float) -> int:
    return round(inr * 100)


def from_paise(paise: int) -> float:
    return paise / 100
