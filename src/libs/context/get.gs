// Get the context object.

if not globals.hasIndex("ContextLib") then globals.ContextLib = {}
ContextLib = globals.ContextLib

// Get() Obtains the context object for the current process, or creates it.
//
// The context object contains:
//    Pages: use the "pages_read" library to access 
ContextLib.Get = function()
    ret = get_custom_object
    if not ret.hasIndex("Pages") then ret.Pages = {}
    if not ret.hasIndex("PagesMeta") then ret.PagesMeta = {"default": "(none)"}
    if not ret.hasIndex("Errors") then ret.Errors = []
    if not ret.hasIndex("NamedSessions") then ret.NamedSessions = {}
    if not ret.NamedSessions.hasIndex("local") then
        ret.NamedSessions.local = {
            "name": "local",
            "ip": null, // could be computer.local_ip or computer.public_ip
            "home": home_dir,
            "user": active_user,
            "password": null,
            "shell": get_shell,
            "computer": get_shell.host_computer,
            "cwd": home_dir,
            "cwdr": "~",
            "cwdn": "~",
            "on_logout": null,
            "on_logout_post": null,
            "on_login": null,
            "on_cmd": null,
            "on_cmd_post": null,
            "parent": null,
            "env": {},
        }
    end if
    if not ret.hasIndex("CurrentSessionName") then ret.CurrentSessionName = "local"
    return ret
end function
