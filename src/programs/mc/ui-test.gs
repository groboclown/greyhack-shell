// Test the ui script.

import_code("ui.gs")
import_code("../../libs/context/pages-read.gs")
import_code("../../libs/context/logs.gs")
import_code("../../libs/format/formatted-str.gs")
import_code("../../libs/errors.gs")
import_code("../../libs/tests.gs")

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
    ui.ColSep = "-"
    res = ui._get_ordered_fields({
        "v1": {"Color": "1234", "Order": 1},
        "v2": {"Color": "a"},
        "v3": {"Color": "3", "Order": 2}})
    t.AssertEqual(res.len, 2)
    t.AssertEqual(res[0].Name, "v1")
    t.AssertEqual(res[1].Name, "v3")

    t.AssertEqual("1234", res[0].Color)
    t.AssertEqual("3",    res[1].Color)

    t.AssertEqual(null, res[0].Text)
    t.AssertEqual(null, res[1].Text)

    // colsep takes up 1 column in the middle.
    t.AssertEqual(5, res[0].Width)
    t.AssertEqual(5, res[1].Width)
end function


if locals == globals then T.RunTests
