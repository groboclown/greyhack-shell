// Test the configuration code.

import_code("config.gs")
import_code("../../libs/errors.gs")
import_code("../../libs/tests.gs")
import_code("../../libs/context/session.gs")
import_code("../../libs/files/json.gs")
import_code("../../libs/files/paths.gs")

TestConfig_Load = function(t)
    // Mock up the session and context.
    local_computer = {}
    local_computer.File = function(p)
        return {"is_binary": false, "is_folder": false, "path": p, "get_content": "{""s1"": {""anum"": 2}}"}
    end function
    context = {
        "Errors": [],
        "NamedSessions": {"local": {"Home": "/", "Cwd": "/tmp", "Shell": {}, "Computer": local_computer}},
        "CurrentSessionName": "local"}
    // First make sure our mock is good.
    session = ContextLib.GetSession(context)
    t.AssertDeepEqual([], context.Errors)
    if t.AssertNotNull(session, "Failed to mock up session right") then return

    cfg = MCConfig.Load(context)
    if t.AssertNotNull(cfg, "Load returned a null value") then return
    for k in cfg.indexes
        print("Config: [" + k + "]")
    end for

    t.AssertEqual(2, cfg.Section("s1").Int("anum"))
end function

if locals == globals then T.RunTests
