"""initial plimsoll tables"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("symbol", sa.Text(), nullable=False, index=True),
        sa.Column("classification", sa.Text(), nullable=False),
        sa.Column("depth", postgresql.JSONB(), nullable=False),
        sa.Column("ticker", postgresql.JSONB(), nullable=False),
        sa.Column("exchange_info", postgresql.JSONB(), nullable=False),
        sa.Column("hash", sa.Text(), nullable=False, unique=True),
    )
    op.create_table(
        "constitution",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", sa.Text(), nullable=False, index=True),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "intents",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("parsed", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "decisions",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("intent_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("intents.id")),
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("snapshots.id")),
        sa.Column("capacity", postgresql.JSONB(), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("binding", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "approvals",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("decision_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("decisions.id")),
        sa.Column("snapshot_hash", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
    )
    op.create_table(
        "positions",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("symbol", sa.Text(), nullable=False, index=True),
        sa.Column("qty", sa.Numeric(), nullable=False),
        sa.Column("avg_px", sa.Numeric(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "capacity_observations",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("symbol", sa.Text(), nullable=False, index=True),
        sa.Column("cost_cap", sa.Numeric(), nullable=False),
        sa.Column("time_cap", sa.Numeric(), nullable=False),
        sa.Column("binding", sa.Text(), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "fills",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("client_order_id", sa.Text(), nullable=False),
        sa.Column("order_id", sa.Text(), nullable=True),
        sa.Column("executed_qty", sa.Numeric(), nullable=False),
        sa.Column("cumm_quote", sa.Numeric(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("raw", postgresql.JSONB(), nullable=False),
        sa.UniqueConstraint("client_order_id", name="uq_fills_client_order_id"),
    )
    op.create_table(
        "audit_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("audit_events")
    op.drop_table("fills")
    op.drop_table("capacity_observations")
    op.drop_table("positions")
    op.drop_table("approvals")
    op.drop_table("decisions")
    op.drop_table("intents")
    op.drop_table("constitution")
    op.drop_table("snapshots")
