// Get the context object.

if not globals.hasIndex("ContextLib") then globals.ContextLib = {}

// Get() Obtains the context object for the current process, or creates it.
ContextLib.Get = function()
    ret = get_custom_object
    if not ret.hasIndex("Pages") then ret.Pages = {}
    if not ret.hasIndex("Session") then ret.Session = {
        // l* local
        "lhome": home_dir,
        "luser": active_user,
        "lshell": get_shell,
        "lcomputer": get_shell.host_computer,

        // c* control
        "cshell": get_shell,
        "ccomputer": get_shell.host_computer,
    }
    return ret
end function
