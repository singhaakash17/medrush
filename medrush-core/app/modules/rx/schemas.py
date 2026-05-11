from pydantic import BaseModel
from datetime import datetime


class UploadRxIn(BaseModel):
    """After frontend uploads file to S3, it sends the s3_key here."""
    s3_key: str
    family_member_id: str | None = None


class PresignedUploadOut(BaseModel):
    upload_url: str
    s3_key: str
    expires_in: int


class OcrResultItem(BaseModel):
    raw_medicine_name: str
    dosage: str | None
    frequency: str | None
    duration_days: int | None
    qty_prescribed: int | None


class PrescriptionOut(BaseModel):
    id: str
    principal_id: str
    family_member_id: str | None
    doctor_name: str | None
    hospital_name: str | None
    prescribed_at: datetime | None
    ocr_status: str
    ocr_confidence_bps: int | None
    retention_class: str
    is_verified: bool
    verified_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PrescriptionDetailOut(PrescriptionOut):
    items: list["RxItemOut"] = []
    flags: list["RxFlagOut"] = []


class RxItemOut(BaseModel):
    id: str
    rx_id: str
    medicine_id: str | None
    raw_medicine_name: str
    dosage: str | None
    frequency: str | None
    duration_days: int | None
    qty_prescribed: int | None

    model_config = {"from_attributes": True}


class RxFlagOut(BaseModel):
    id: str
    rx_id: str
    flag_type: str
    description: str
    severity: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PharmacyVerifyRxIn(BaseModel):
    approved: bool
    notes: str | None = None
