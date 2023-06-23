import_code("ui.gs")
import_code("../../libs/context/pages-read.gs")
import_code("../../libs/context/logs.gs")
import_code("../../libs/context/console.gs")
import_code("../../libs/format/formatted-str.gs")
import_code("../../libs/std-lib/sort.gs")
import_code("../../libs/errors.gs")
import_code("../../libs/tests.gs")

// Test the ui script.


// TestUI_get_ordered_fields_none() Test the ordered fields if there isn't anything.
TestUI_get_ordered_fields_none = function(t)
    ui = UI.New()
    res = ui._get_ordered_fields({})
    t.AssertDeepEqual([], res)
end function

// TestUI_get_ordered_fields_notSized() Test the ordered fields with unsized elements
TestUI_get_ordered_fields_notSized = function(t)
    ui = UI.New()
    ui.Width = 11
    ui.ColSep = { "t": "-" }
    res = ui._get_ordered_fields({
        "v1": {"Style": "1234", "Order": 1},
        "v2": {"Style": "a"},
        "v3": {"Style": "3", "Order": 2}})
    if t.AssertEqual(2, res.len) then return
    t.AssertEqual("v1", res[0].Name)
    t.AssertEqual("v3", res[1].Name)

    t.AssertEqual("1234", res[0].Style)
    t.AssertEqual("3",    res[1].Style)

    t.AssertEqual(null, res[0].Text)
    t.AssertEqual(null, res[1].Text)

    t.AssertEqual(null, res[0].Width)
    t.AssertEqual(null, res[1].Width)

    // colsep takes up 1 column in the middle.
    ContextLib.Console.ComputeColumnWidth(res, "-", 11)
    t.AssertEqual(5, res[0].ComputedWidth)
    t.AssertEqual(5, res[1].ComputedWidth)
end function

// TestUI_draw_row_log() Test drawing a log row.
TestUI_draw_row_log = function(t)
    ui = UI.New()
    ui.Width = 20
    ui.ColSep = { "t": "|" }
    rows = ui._draw_row_set([
        {"level": "warning", "msg": "tuna", "args": {}, "text": "tuna1"},
        {"level": "error", "msg": "crab", "args": {}, "text": "crab2"},
    ], ContextLib.LogPage.Metadata, 2, 0)
    if t.AssertEqual(2, rows.len) then return
    t.AssertEqual(
        "<color=#606060>warn</color>|<color=#a04000>tuna1          </color>",
        rows[0])
    t.AssertEqual(
        "<color=#606060>erro</color>|<color=#f02020>crab2          </color>",
        rows[1])
end function

if locals == globals then T.RunTests
