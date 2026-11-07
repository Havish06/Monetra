import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    commitment_id: uuid.UUID
    user_id: uuid.UUID
    amount: Decimal | None
    due_date: date
    status: str
    paid_at: datetime | None
    created_at: datetime