// Load the config file.

ProcessConfigFile = function(context, ui, cmdlets)
    config = MCConfig.Load(context)
    if config == null then exit("Failed to load config\n" + FormatStr.PyFormat("{err}", {"err":context.Errors}))
    print("Loading config into ui")
    ui.LoadConfig(config.Section("ui"))
    
    print("Loading config into cmdlets")
    cmdlets.LoadConfig(config.Section("cmdlets"))
    
    print("Loading config into base session")
    session = ContextLib.GetSession(context)
    if session != null then
        sessionSection = config.Section("user")
        configEnv = sessionSection.StrMap("env")
        for key in configEnv.indexes
            session.Env[key] = configEnv[key]
        end for
    end if
    // Look into having a per-session env in the config file.
end function
