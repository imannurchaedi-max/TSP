"""
LangGraph State Machine Engine for TSP Modul
-------------------------------------------
Demonstrates LangGraph StateGraph engine for the "happy path" (consume) branch of the
barcode scan lifecycle: terima_wrm -> kirim_mesin -> terima_operator -> consume_operator.

NOT covered here: the retur branch (retur_dari_mesin -> retur_ke_wrm). In the real state
machine (Active/Config.js EVENTS) retur_dari_mesin's prerequisite is kirim_mesin (not
terima_operator/consume_operator), so it needs its own conditional edge straight off
"kirim_mesin" rather than chaining off this graph's linear happy path -- left as a TODO
rather than bolted on inaccurately. This is a standalone demo/exploration script, not
wired into npm run docs:build or any deploy step; it does not reflect production traffic.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END


class BarcodeState(BaseModel):
    barcode: str
    parent_barcode: Optional[str] = None
    mid: str = ""
    qty: float = 0.0
    mesin: str = ""
    current_checkpoint: str = "INIT"
    history: List[str] = Field(default_factory=list)
    status: str = "VALID"
    error_message: Optional[str] = None


def terima_wrm_step(state: BarcodeState) -> BarcodeState:
    """Step 1: TSP terima pallet dari WRM."""
    if state.current_checkpoint != "INIT":
        state.status = "INVALID"
        state.error_message = "terima_wrm hanya bisa dilakukan untuk barcode baru"
        return state

    state.current_checkpoint = "terima_wrm"
    state.history.append("terima_wrm")
    return state


def kirim_mesin_step(state: BarcodeState) -> BarcodeState:
    """Step 2: TSP kirim barcode ke Mesin."""
    if state.current_checkpoint != "terima_wrm":
        state.status = "INVALID"
        state.error_message = "kirim_mesin memerlukan checkpoint terima_wrm terlebih dahulu"
        return state

    state.current_checkpoint = "kirim_mesin"
    state.history.append("kirim_mesin")
    return state


def terima_operator_step(state: BarcodeState) -> BarcodeState:
    """Step 3: Operator scan terima dari TSP."""
    if state.current_checkpoint != "kirim_mesin":
        state.status = "INVALID"
        state.error_message = "terima_operator memerlukan checkpoint kirim_mesin"
        return state

    state.current_checkpoint = "terima_operator"
    state.history.append("terima_operator")
    return state


def consume_operator_step(state: BarcodeState) -> BarcodeState:
    """Step 4: Operator consume material di mesin."""
    if state.current_checkpoint != "terima_operator":
        state.status = "INVALID"
        state.error_message = "consume_operator memerlukan checkpoint terima_operator"
        return state

    state.current_checkpoint = "consume_operator"
    state.history.append("consume_operator")
    return state


def route_next_checkpoint(state: BarcodeState) -> str:
    """Router for LangGraph workflow transition."""
    if state.status == "INVALID":
        return END

    if state.current_checkpoint == "terima_wrm":
        return "kirim_mesin"
    elif state.current_checkpoint == "kirim_mesin":
        return "terima_operator"
    elif state.current_checkpoint == "terima_operator":
        return "consume_operator"
    else:
        return END


def create_tsp_workflow():
    """Build LangGraph StateGraph engine."""
    builder = StateGraph(BarcodeState)

    builder.add_node("terima_wrm", terima_wrm_step)
    builder.add_node("kirim_mesin", kirim_mesin_step)
    builder.add_node("terima_operator", terima_operator_step)
    builder.add_node("consume_operator", consume_operator_step)

    builder.set_entry_point("terima_wrm")

    builder.add_conditional_edges(
        "terima_wrm",
        route_next_checkpoint,
        {"kirim_mesin": "kirim_mesin", END: END}
    )
    builder.add_conditional_edges(
        "kirim_mesin",
        route_next_checkpoint,
        {"terima_operator": "terima_operator", END: END}
    )
    builder.add_conditional_edges(
        "terima_operator",
        route_next_checkpoint,
        {"consume_operator": "consume_operator", END: END}
    )
    builder.add_edge("consume_operator", END)

    return builder.compile()


if __name__ == "__main__":
    app = create_tsp_workflow()

    initial_state = BarcodeState(
        barcode="DTA15M2708199-01",
        parent_barcode="DTA15M2708199",
        mid="MID-10023",
        qty=50.0,
        mesin="PANTS-01"
    )

    result = app.invoke(initial_state)
    print("[LangGraph Agent] Final state after full lifecycle:")
    print(f"  Barcode: {result['barcode']}")
    print(f"  Checkpoint: {result['current_checkpoint']}")
    print(f"  History: {' -> '.join(result['history'])}")
    print(f"  Status: {result['status']}")
