// Test the getter.

import_code("get.gs")
import_code("../errors.gs")
import_code("../tests.gs")

// TestGet_no_context() Ensures that, with a blank context object, it is created.
TestGet_no_context = function(t)
    existing = get_custom_object
    while existing.len > 0
        existing.pop()
    end while

    context = ContextLib.Get()
    t.AssertEqual("local", context.NamedSessions.local.name)
end function

if locals == globals then T.RunTests
