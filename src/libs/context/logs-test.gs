// Test logging.

import_code("logs.gs")
import_code("../errors.gs")
import_code("../tests.gs")

// Required
import_code("get.gs")
import_code("pages-create.gs")
import_code("pages-send.gs")
import_code("pages-read.gs")
import_code("../format/formatted-str.gs")

// TestLogs_simple() Creates a new log entry when there is no previous log page.
TestLogs_empty_simple = function(t)
    // Clear out the custom object.
    existing = get_custom_object
    while existing.len > 0
        existing.pop()
    end while
    existing.PagesMeta = {}
    existing.PagesMeta[ContextLib.LogPage.Name] = ContextLib.LogPage.Metadata

    logger = ContextLib.Logger.New()
    logger.Error("simple")
    context = ContextLib.Get()
    entry = ContextLib.NextPageRow(context, ContextLib.LogPage.Name)
    if t.AssertNotNull(entry, "null first row") then return
    t.AssertEqual("error", entry.level)
    t.AssertEqual("simple", entry.text)
    t.AssertEqual("simple", entry.msg)
    t.AssertDeepEqual({}, entry.args)
end function

if locals == globals then T.RunTests
