import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class AnswerItem(BaseModel):
    """
    A single question-answer pair submitted by the patient.
    """
    question_id: uuid.UUID
    answer_text: str = Field(
        min_length=1,
        max_length=2000,
        description="Patient's answer to the question"
    )


class SubmitAnswersRequest(BaseModel):
    """
    The full submission — a list of all answers at once.
    Patient answers all questions and submits together.
    """
    answers: list[AnswerItem] = Field(
        min_length=1,
        description="List of answers, one per question"
    )


class AnswerResponse(BaseModel):
    """
    A single saved answer returned to the client.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    consultation_id: uuid.UUID
    question_id: uuid.UUID
    answer_text: str
    answered_at: datetime


class SubmitAnswersResponse(BaseModel):
    """
    Full response after submitting answers.
    Confirms what was saved and the updated consultation status.
    """
    consultation_id: uuid.UUID
    status: str
    message: str
    answers: list[AnswerResponse]