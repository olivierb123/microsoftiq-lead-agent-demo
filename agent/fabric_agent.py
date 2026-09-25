from __future__ import annotations

import os

from agent_framework import Agent
from agent_framework.foundry import FoundryChatClient
from azure.identity import DefaultAzureCredential
from dotenv import load_dotenv

from fabric_tools import query_sales_performance

load_dotenv()

PROJECT_ENDPOINT = os.environ["FOUNDRY_PROJECT_ENDPOINT"]
MODEL_DEPLOYMENT_NAME = os.environ.get("AZURE_AI_MODEL_DEPLOYMENT_NAME", "gpt-4o")

INSTRUCTIONS = (
    "You are Fabric IQ, a grounding agent for FieldForge's Sales Performance data, "
    "backed by a live Fabric semantic model (not a static snapshot). Always call "
    "query_sales_performance to answer — never rely on general knowledge or prior "
    "turns for the actual numbers. Every answer must end with the exact citation "
    "line: \"Source: Fabric IQ semantic model — sales_performance table, live "
    "query.\" If the query returns no matching rows, say so plainly instead of "
    "guessing."
)


def build_fabric_agent() -> Agent:
    """Build the Fabric IQ Sales Performance agent: a Foundry-hosted chat model
    grounded by a live query against a real Fabric semantic model, via a custom
    function tool (no native Agent Framework Fabric/Power BI hosted tool exists)."""
    chat_client = FoundryChatClient(
        project_endpoint=PROJECT_ENDPOINT,
        model=MODEL_DEPLOYMENT_NAME,
        credential=DefaultAzureCredential(),
    )
    return Agent(
        chat_client,
        instructions=INSTRUCTIONS,
        name="FabricIQSalesAgent",
        tools=[query_sales_performance],
    )
