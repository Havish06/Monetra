"""Add salary settings and persistent monthly plans."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "42d7c1a9b6e2"
down_revision: Union[str, Sequence[str], None] = "8cb74283101e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "salary_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("monthly_salary", sa.Numeric(14, 2), nullable=False),
        sa.Column("payday_day", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_salary_profiles_user_id", "salary_profiles", ["user_id"], unique=True)
    op.create_table(
        "monthly_plans",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("month_start", sa.Date(), nullable=False),
        sa.Column("salary_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("savings_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("buffer_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("planned_expenses", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "month_start", name="uq_monthly_plan_user_month"),
    )
    op.create_index("ix_monthly_plans_user_id", "monthly_plans", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_monthly_plans_user_id", table_name="monthly_plans")
    op.drop_table("monthly_plans")
    op.drop_index("ix_salary_profiles_user_id", table_name="salary_profiles")
    op.drop_table("salary_profiles")
