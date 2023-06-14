// Test the session functions

import_code("session.gs")
import_code("get.gs")
import_code("../errors.gs")
import_code("../tests.gs")


// TestLogTestSession_AddSession_fails() Add a new session but it fails.
TestSession_AddSession_fails = function(t)
    // Clear out the custom object.
    existing = get_custom_object
    while existing.len > 0
        existing.pop()
    end while

    context = ContextLib.Get()

    // Setup a mock login function
    calledWith = []
    mockConnect = function(ip, port, user, pass)
        outer.calledWith.push({"ip": ip, "port": port, "user": user, "pass": pass})
        return "Failed to connect"
    end function
    context.NamedSessions.local.shell = {}
    context.NamedSessions.local.shell.connect_service = @mockConnect

    res = ContextLib.AddSession(context, "foo", "0.0.0.0", 1, "u", "p")
    t.AssertDeepEqual(calledWith, [{"ip": "0.0.0.0", "port": 1, "user": "u", "pass": "p"}])
    t.AssertNull(res, "add session result")
    t.AssertEqual(context.Errors.len, 1)
end function


if locals == globals then T.RunTests
