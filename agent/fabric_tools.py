from __future__ import annotations

import os

import requests
from azure.identity import DefaultAzureCredential

POWERBI_TOKEN_SCOPE = "https://analysis.windows.net/powerbi/api/.default"
TABLE_NAME = "sales_performance"

WORKSPACE_ID = os.environ["AZURE_POWERBI_WORKSPACE_ID"]
DATASET_ID = os.environ["AZURE_POWERBI_DATASET_ID"]

# DefaultAzureCredential resolves to the deployed agent's own Instance Identity
# Principal ID. An earlier attempt at this got a flat 401 here, but that was
# against a Direct Lake (Lakehouse-backed) semantic model — its OneLake/
# Lakehouse ACL layer was the actual blocker, not the identity type. Once the
# dataset was rebuilt as a plain Import-mode semantic model (see docs/
# azure-implementation.md), the same identity authenticates fine with just
# workspace Contributor — no separate service principal/client secret needed.
_credential = DefaultAzureCredential()


def _dax_string_literal(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def _build_dax_query(territory: str | None, month: str | None) -> str:
    conditions = []
    if territory:
        conditions.append(f"{TABLE_NAME}[territory] = {_dax_string_literal(territory)}")
    if month:
        conditions.append(f"{TABLE_NAME}[month] = {_dax_string_literal(month)}")

    if not conditions:
        return f"EVALUATE {TABLE_NAME}"

    filter_expr = " && ".join(conditions)
    return f"EVALUATE FILTER({TABLE_NAME}, {filter_expr})"


def _strip_table_prefix(column_name: str) -> str:
    return column_name.split("[", 1)[1].rstrip("]") if "[" in column_name else column_name


def query_sales_performance(territory: str | None = None, month: str | None = None) -> list[dict]:
    """Query the Fabric IQ Sales Performance semantic model, optionally filtered
    by territory and/or month. Returns matching rows (territory, segment, seller,
    month, revenue, quota, variancePct) queried live from the live Fabric
    semantic model — not a mock or cached dataset."""
    token = _credential.get_token(POWERBI_TOKEN_SCOPE).token
    dax_query = _build_dax_query(territory, month)

    response = requests.post(
        f"https://api.powerbi.com/v1.0/myorg/groups/{WORKSPACE_ID}/datasets/{DATASET_ID}/executeQueries",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={
            "queries": [{"query": dax_query}],
            "serializerSettings": {"includeNulls": True},
        },
        timeout=30,
    )
    response.raise_for_status()

    rows = response.json()["results"][0]["tables"][0]["rows"]
    return [{_strip_table_prefix(k): v for k, v in row.items()} for row in rows]
