// Manages the session objects.

// Required libraries:
// import_code("../errors.gs")

if not globals.hasIndex("ContextLib") then globals.ContextLib = {}
ContextLib = globals.ContextLib

// AddSession() Add a new session object.
//
// Returns the new session object, or null if there was a problem connecting.
//
// The session will connect to the ip address on the port using the user name and password.
// If 'encrypt is not null, then it must be a function that takes the password and returns an
// encoded value back.  If 'source' is not null, then it indicates the session name or
// session object to use to make the connection.
ContextLib.AddSession = function(context, name, ipAddress, port, user, password, source=null, encrypt=null)
    // Developer note: updating the values in the session object requires
    // updating the `get.gs` script, tool.
    if context == null or not context isa map or not context.hasIndex("NamedSessions") then return null
    if encrypt != null then
        password = encrypt(password)
    end if
    if password == null or name == null or ipAddress == null or port == null or user == null or not password isa string or not name isa string or not ipAddress isa string or not port isa number or not user isa string then
        return null
    end if
    if source == null then source = "local"
    if source != null and source isa string and context.NamedSessions.hasIndex(source) then
        source = context.NamedSessions[source]
    end if
    if source == null then
        context.Errors.push(ErrorLib.Error.New("unknown source session", {"source": "AddSession"}))
        return null
    end if
    shell = source.shell.connect_service(ipAddress, port, user, password)
    if shell == null or shell isa string then
        context.Errors.push(ErrorLib.Error.New(
            "Failed connecting to {ipAddress}:{port} ({err})", {"source": "AddSession", "ipAddress": ipAddress, "port": port, "err": shell}))
        return null
    end if

    ret = {
        "name": name,
        "ip": ipAddress,
        "home": "/home/" + user, // best guess
        "user": user,
        "password": password,
        "shell": shell,
        "computer": shell.host_computer,
        "cwd": "/home/" + user,
        "cwdr": "~",
        "cwdn": "~",
        "on_logout": null,
        "on_logout_post": null,
        "on_login": null,
        "on_cmd": null,
        "on_cmd_post": null,
        "parent": source.name,
        "env": {},
    }
    context.NamedSessions[name] = ret
    if ContextLib.hasIndex("Log") then
        ContextLib.Log("info", "Logged into {ip}", {
            "ip": shell.ip,
            "user": shell.user,
        })
    end if
    return ret
end function

// GetSession() Get the named session.
ContextLib.GetSession = function(context, name=null)
    if context == null or not context isa map or not context.hasIndex("NamedSessions") then
        return null
    end if
    if name == null then name = context.CurrentSessionName
    if not context.NamedSessions.hasIndex(name) then
        context.Errors.push(ErrorLib.Error.New(
            "No such active session: {name}", {"source": "GetSession", "name": name}))
        return null
    end if
    ret = context.NamedSessions[name]
    if ret.shell == null then
        // Requires a login.
        if ret.parent == null then
            context.Errors.push(ErrorLib.Error.New(
                "No known parent for session {name}", {"source": "GetSession", "name": name}))
            return null
        end if
        shell = ret.parent.shell.connect_service(ipAddress, port, user, password)
        if shell == null or shell isa string then
            context.Errors.push(ErrorLib.Error.New(
                "Failed connecting to {ipAddress}:{port} ({err})", {"source": "GetSession", "ipAddress": ipAddress, "port": port, err: shell}))
            return null
        end if
        ret.shell = shell
        ret.computer = shell.host_computer
        if ContextLib.hasIndex("Log") then
            ContextLib.Log("info", "Logged into {ip}", {
                "ip": shell.ip,
                "user": shell.user,
            })
        end if
        // Does nothing if not a function, calls if a function.
        ret.on_login
    end if
    return ret
end function

// SessionLogout() Logs out of the session if it is currently logged in.
//
// Does not close the session.  If the session was successfully logged out, then
// a later GetSession will cause a login.
ContextLib.SessionLogout = function(context, name=null)
    if context == null or not context isa map or not context.hasIndex("NamedSessions") then return null
    if name == null then name = context.CurrentSessionName
    if not context.NamedSessions.hasIndex(name) then
        context.Errors.push(ErrorLib.Error.New(
            "No such active session: {name}", {"source": "SessionLogout", "name": name}))
        return null
    end if
    ret = context.NamedSessions[name]
    if ret.shell != null then
        // Does nothing if not a function, calls if a function.
        ret.on_logout

        // TODO what is the right approach to log out?
        ret.shell = null
        
        if ContextLib.hasIndex("Log") then
            ContextLib.Log("info", "Logged out of {ip}", {
                "ip": shell.ip,
                "user": shell.user,
            })
        end if

        ret.on_logout_post
        return true
    end if
    return false
end function
