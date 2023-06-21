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
            "Name": "local",
            "Ip": null, // could be computer.local_ip or computer.public_ip
            "Home": home_dir,
            "User": active_user,
            "Password": null,
            "Shell": get_shell,
            "Computer": get_shell.host_computer,
            "Cwd": home_dir,
            "CwdR": "~",
            "CwdN": "~",
            "OnLogout": null,
            "OnLogoutPost": null,
            "OnLogin": null,
            "OnCmd": null,
            "OnCmdPost": null,
            "Parent": null,
            "Env": {},
        }
    end if
    if not ret.hasIndex("CurrentSessionName") then ret.CurrentSessionName = "local"
    return ret
end function
