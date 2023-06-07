// A Formatted String implementation.
// Inspired by Python.

if not globals.hasIndex("FormatStr") then
    globals.FormatStr = {}
end if

FormatStr.ESCAPES = {
    "n": char(10),
    "r": char(13),
    "t": char(9),
}

FormatStr.PyFormat = function(text, paramMap)
    ret = ""
    state = 0
    start = 0
    vstart = 0
    vend = 0
    cstart = 0
    for pos in text.indexes
        c = text[pos]
        if state == 0 then
            // outside '{' stuff
            if c == "{" then
                // Add in the stuff up to this point.
                ret = ret + text[start:pos]
                start = pos
                vstart = pos + 1
                state = 2
            else if c == "\" then
                // Escape text
                ret = ret + text[start:pos]
                start = pos
                state = 3
            end if
            // Else keep plodding along.
        else if state == 1 then
            // escape stuff
            if FormatStr.ESCAPES.hasIndex(c) then
                ret = ret + FormatStr.ESCAPES[c]
            else
                ret = ret + c
            end if
            state = 0
            start = pos
        else if state == 2 then
            // inside a '{', before the ':'.  Find the parameter name.
            if c == ":" or c == "}" then
                name = text[vstart:pos]
                if paramMap.hasIndex(name) then
                    // Found the value.
                    if c == ":" then
                        // Need to format the value later.
                        // Save our spot.
                        vend = pos
                        cstart = pos + 1
                        state = 3
                    else
                        // Add in the value as-is.
                        ret = ret + FormatStr._as_str(paramMap[name])
                        state = 0
                        start = pos + 1
                    end if
                else
                    // Not found, so ignore it.
                    // Note that 'start' is still in the right spot.
                    state = 0
                end if
            end if
            // Else keep plodding along
        else if state == 3 then
            // inside '{}' stuff, after the ':'
            // vstart:vend marks the parameter name, which is known to exist.
            if c == "}" then
                // Found the end of the formatting.
                // TODO format.
                name = text[vstart:vend]
                ret = ret + FormatStr._as_str(paramMap[name])
                state = 0
                start = pos + 1
            end if
            // Else keep plodding along
        end if
    end for
    if start < text.len then ret = ret + text[start:]
    return ret
end function

FormatStr._is_seen = function(val, seen)
    for i in seen.indexes
        if seen[i] == val then return i
    end for
    seen.push(val)
    return -seen.len
end function

FormatStr._as_str = function(val, seen=null)
    if val == null then return "(null)"
    if val isa string then return val
    if val isa number then return str(val)
    if val isa funcRef then return "(function)"
    if val isa map then
        if val.hasIndex("Text") then return val.Text
        if val.len <= 0 then return "{}"
        
        if seen == null then seen = []
        idx = FormatStr._is_seen(val, seen)
        if idx >= 0 then return "(id " + idx + ")"

        ret = "#" + (-idx) + ":{"
        if val.hasIndex("__isa") then ret = ret + "(Object) "
        first = true
        for key in val.indexes
            if key == "__isa" then continue
            if first then
                first = false
            else
                ret = ret + ", "
            end if
            ret = ret + key + ": " + FormatStr._as_str(val[key], seen)
        end for
        return ret + "}"
    end if
    if val isa list then
        if val.len <= 0 then return "[]"

        if seen == null then seen = []
        idx = FormatStr._is_seen(val, seen)
        if idx >= 0 then return "(id " + idx + ")"

        ret = "#" + (-idx) + ":["
        first = true
        for v in val
            if first then
                first = false
            else
                ret = ret + ", "
            end if
            ret = ret + FormatStr._as_str(v, seen)
        end for
        return ret + "]"
    end if
    return "(unknown " + typeof(val) + "=" + str(val) + ")"
end function
