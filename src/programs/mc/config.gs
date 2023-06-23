// Configuration loading and saving.

// requires:
// import_code("../../libs/context/session.gs")
// import_code("../../libs/files/json.gs")
// import_code("../../libs/files/paths.gs")

MCConfig = {}

// Load() Load the MC configuration.
MCConfig.Load = function(context, filename = null)
    if filename == null then filename = "~/.mc.json"
    session = ContextLib.GetSession(context)
    if session == null then
        print("ERROR: NO SESSION FOUND")
        return null
    end if
    filename = FileLib.Paths.NormalizeFilename(filename, session.Home, session.Cwd)
    print("Loading file " + filename)
    f = session.Computer.File(filename)
    if f == null or f.is_binary or f.is_folder then
        // Loading a null config file is fine.
        print("Could not find a configuration file named " + filename + " ( " + f + ")")
        loaded = {}
        f = null
    else
        loaded = FileLib.Json.parse(f.get_content)
        if loaded == null or not loaded isa map then
            print("Parsing the file as a json object returned a bad value: " + loaded)
            loaded = {}
        end if
    end if

    // Turn the loaded map into a config object.
    ret = {}
    ret.Section = @MCConfig.obj.Section
    ret.cfg = loaded
    if f == null then
        ret.filename = filename
        ret.file = null
    else
        ret.filename = f.path
        ret.file = f
    end if
    return ret
end function


MCConfig.obj = {}

MCConfig.obj.Section = function(name)
    ret = new MCConfig.sec
    ret.cfg = {}
    if self.cfg.hasIndex(name) then
        r = self.cfg[name]
        if r isa map then
            ret.cfg = r
        else
            self.cfg[name] = ret.cfg
        end if
    else
        self.cfg[name] = ret.cfg
    end if
    return ret
end function

MCConfig.obj.Save = function()
    // Not Implemented.
end function

MCConfig.sec = {}

MCConfig.sec.Int = function(key, defaultValue)
    if self.cfg.hasIndex(key) then
        ret = self.cfg[key]
        if ret isa number then return floor(ret)
        if ret isa string then return floor(ret.val)
    end if
    return defaultValue
end function

MCConfig.sec.Str = function(key, defaultValue)
    if self.cfg.hasIndex(key) then
        ret = self.cfg[key]
        if ret isa string then return ret
        if ret isa number then return str(ret)
    end if
    return defaultValue
end function

MCConfig.sec.StrList = function(key, defaultValue)
    if self.cfg.hasIndex(key) then
        ret = self.cfg[key]
        if ret isa string then return [ret]
        if ret isa number then return [str(ret)]
        if ret isa list then
            listRes = []
            for item in ret
                if item isa string then
                    listRes.push(item)
                else if item isa number then
                    listRes.push(str(ret))
                end if
            end for
            return listRes
        end if
    end if
    return defaultValue
end function

MCConfig.sec.StrMap = function(key, defaultValue)
    if self.cfg.hasIndex(key) then
        ret = self.cfg[key]
        if ret isa map then
            mapRes = {}
            for key in ret.indexes
                // json maps always have string keys.
                item = ret[key]
                if key isa string and (item isa string or item isa number) then
                    mapRes[key] = str(item)
                end if
            end for
            return mapRes
        end if
    end if
    return defaultValue
end function

// A console Style map from a configuration.
MCConfig.sec.StyleMap = function(key, defaultValue)
    if self.cfg.hasIndex(key) then
        cfgMap = self.cfg[key]
        if cfgMap isa map then
            mapRes = {}
            if cfgMap.hasIndex("color") and cfgMap.color isa string then mapRes.c = cfgMap.color
            if cfgMap.hasIndex("c") and cfgMap.c isa string then mapRes.c = cfgMap.c
            if cfgMap.hasIndex("background") and cfgMap.background isa string then mapRes.bg = cfgMap.background
            if cfgMap.hasIndex("bg") and cfgMap.bg isa string then mapRes.bg = cfgMap.bg
            if cfgMap.hasIndex("underline") and cfgMap.underline isa number then mapRes.u = cfgMap.underline
            if cfgMap.hasIndex("u") and cfgMap.u isa number then mapRes.u = cfgMap.u
            if cfgMap.hasIndex("bold") and cfgMap.bold isa number then mapRes.b = cfgMap.bold
            if cfgMap.hasIndex("b") and cfgMap.b isa number then mapRes.b = cfgMap.b
            if cfgMap.hasIndex("italics") and cfgMap.italics isa number then mapRes.i = cfgMap.italics
            if cfgMap.hasIndex("i") and cfgMap.i isa number then mapRes.i = cfgMap.i
            if cfgMap.hasIndex("strikethrough") and cfgMap.strikethrough isa number then mapRes.s = cfgMap.strikethrough
            if cfgMap.hasIndex("s") and cfgMap.s isa number then mapRes.s = cfgMap.s
            return mapRes
        end if
    end if
    return defaultValue
end function

// A console Style map + text from a configuration.
MCConfig.sec.StyledTextMap = function(key, defaultValue)
    if self.cfg.hasIndex(key) then
        cfgMap = self.cfg[key]
        if cfgMap isa string then return { "t": cfgMap }
        if cfgMap isa map then
            mapRes = {}
            if cfgMap.hasIndex("text") and (cfgMap.text isa string or cfgMap.text isa number) then mapRes.t = cfgMap.text
            if cfgMap.hasIndex("t") and (cfgMap.t isa string or cfgMap.t isa number) isa string then mapRes.t = cfgMap.t
            if cfgMap.hasIndex("color") and cfgMap.color isa string then mapRes.c = cfgMap.color
            if cfgMap.hasIndex("c") and cfgMap.c isa string then mapRes.c = cfgMap.c
            if cfgMap.hasIndex("background") and cfgMap.background isa string then mapRes.bg = cfgMap.background
            if cfgMap.hasIndex("bg") and cfgMap.bg isa string then mapRes.bg = cfgMap.bg
            if cfgMap.hasIndex("underline") and cfgMap.underline isa number then mapRes.u = cfgMap.underline
            if cfgMap.hasIndex("u") and cfgMap.u isa number then mapRes.u = cfgMap.u
            if cfgMap.hasIndex("bold") and cfgMap.bold isa number then mapRes.b = cfgMap.bold
            if cfgMap.hasIndex("b") and cfgMap.b isa number then mapRes.b = cfgMap.b
            if cfgMap.hasIndex("italics") and cfgMap.italics isa number then mapRes.i = cfgMap.italics
            if cfgMap.hasIndex("i") and cfgMap.i isa number then mapRes.i = cfgMap.i
            if cfgMap.hasIndex("strikethrough") and cfgMap.strikethrough isa number then mapRes.s = cfgMap.strikethrough
            if cfgMap.hasIndex("s") and cfgMap.s isa number then mapRes.s = cfgMap.s
            return mapRes
        end if
    end if
    return defaultValue
end function
