// A command parser.
// Handles environment variable replacement, string quoting,
// escaping, special page context replacement, multiple
// commands on a single line, and argument separation.
// Does not handle:
//   - alias replacements;
//   - file glob expansion;
//   - sub-command execution;
//   - multi-line statements.
// To do this like a proper shell requires merging the
// command execution callback and input reading into the
// parser.
// Right now, the file expansion happens in the cmdlets,
// which is wrong because it means it doesn't take into
// account quoting or escaping to prevent expansion.

ParsedCommand = {}

ParsedCommand.Argument = {}

ParsedCommand.Command = {}
ParsedCommand.Command.New = function(name, args, errors)
    ret = new ParsedCommand.Command
    ret.Name = name
    // Arguments are strings, never commands.  The $() syntax
    // is not supported.  With the removal of stdout, it loses its
    // meaning.  Now, this is done through page references.
    ret.Args = args
    ret.Errors = errors
    ret.PromptOnExit = false

    // This hasn't been implemented yet.  It's goal is to
    // support ";", "&&", and "||" style tie-ins.
    ret.NextInvocation = 0

    return ret
end function

ParsedCommand.CharClass = {
    "LF": char(10),
    "CR": char(13),
    "SP": " ",
    "TAB": char(9),
    "BS": "\",
    "DL": "$",
    "CN": ":",
    "SE": ";",
    "AM": "&",
    "OR": "|",
    "DQ": """",
    "SQ": "'",
    "PO": "(",
    "PC": ")",
    "BO": "[",
    "BC": "]",
    "CO": "{",
    "CC": "}",
    "EX": "!",
    "Escape": {
        "n": char(10),
        "r": char(13),
        "t": char(9),
    },
}
ParsedCommand.CharClass.IsWhitespace = function(c)
    return c == ParsedCommand.CharClass.LF or c == ParsedCommand.CharClass.CR or c == ParsedCommand.CharClass.TAB or c == ParsedCommand.CharClass.SP
end function

// Static function to parse a command into multiple commands + arguments.
//
// Auto-handles arguments in the form "--(name)=(value)" into named arguments.
// Otherwise, they are indexed.
//
// Context is a structure that contains named pages.  Pages are lists of
// maps, which can be referenced through the context access via "[page:12:name]".
ParsedCommand.Parse = function(text, env, context, defaultPage)
    ret = []
    pos = 0
    stateStack = [{ "start": 0, "state": 0, "cmd": null, "args": [], "problems": [] }]
    promptOnExit = false

    endCmd = function()
        genCmd = null
        if stateStack[-1].cmd != null then
            genCmd = ParsedCommand.Command.New(stateStack[-1].cmd, stateStack[-1].args, stateStack[-1].problems)
            // print("<color #ff00ff>DEBUG Push command " + stateStack[-1].cmd + "</color>")
        else if stateStack[-1].args.len > 0 or stateStack[-1].problems.len > 0 then
            // print("<color #ff00ff>DEBUG Error state</color>")
            genCmd = ParsedCommand.Command.New(null, null, stateStack[-1].problems + ["invalid parse state"])
        else
            // print("<color #ff00ff>DEBUG Skip empty command</color>")
        end if
        if genCmd != null then
            genCmd.PromptOnExit = promptOnExit
            outer.ret.push(genCmd)
        end if
        promptOnExit = false
        stateStack[-1].cmd = ""
        stateStack[-1].args = []
        stateStack[-1].problems = []
    end function

    while pos <= text.len
        if pos == text.len then
            c = ""
        else
            c = text[pos]
        end if

        // =====================================
        // Command Name Parsing
        if stateStack[-1].state == 0 then
            // 0 == look for start of a command
            // Anything other than whitespace means starting up a command name.
            // ... kind of ...
            if c == ParsedCommand.CharClass.EX then
                // "!".  Toggle the prompt on exit state.
                promptOnExit = not promptOnExit

            else if c == ParsedCommand.CharClass.DL then
                // "$".  Env.
                stateStack[-1].state = 1
                stateStack.push({"state": 1000, "start": pos})
            else if c == ParsedCommand.CharClass.BO then
                // "[".  Context
                stateStack[-1].state = 1
                stateStack.push({"state": 3000, "start": pos})
            else if c == ParsedCommand.CharClass.BS then
                stateStack[-1].state = 1
                stateStack.push({"state": 200, "start": pos})
            else if c == ParsedCommand.CharClass.SQ then
                stateStack.push({"state": 400, "start": pos})
            else if c == ParsedCommand.CharClass.DQ then
                stateStack[-1].state = 1
                stateStack.push({"state": 300, "start": pos})
            else if c == ParsedCommand.CharClass.SE or c == "" then
                // semi-colon; end the command...
                // but this is the start of a command, so there's nothing to do.

            else if not ParsedCommand.CharClass.IsWhitespace(c) then
                stateStack[-1].state = 1
                stateStack[-1].start = pos
            end if
            // otherwise, whitespace.  Ignore it and keep looking.

        else if stateStack[-1].state == 1 then
            // 1 == inside a command name
            if ParsedCommand.CharClass.IsWhitespace(c) then
                // Encountered whitespace - look for an argument start.
                stateStack[-1].cmd = text[stateStack[-1].start:pos]
                stateStack[-1].state = 100

            else if c == ParsedCommand.CharClass.SE or c == "" then
                // semi-colon; end the command.
                stateStack[-1].cmd = text[stateStack[-1].start:pos]
                endCmd()
                stateStack[-1].state = 0

            else if c == ParsedCommand.CharClass.DL then
                // "$".  Could be all manner of things.
                stateStack.push({"state": 1000, "start": pos})
            else if c == ParsedCommand.CharClass.BS then
                stateStack.push({"state": 200, "start": pos})
            else if c == ParsedCommand.CharClass.SQ then
                // Single quote during a name, which is fine.  It's still part of the name.
                stateStack.push({"state": 400, "start": pos})
            else if c == ParsedCommand.CharClass.DQ then
                // Double quote during a name, which is fine.  It's still part of the name.
                stateStack.push({"state": 300, "start": pos})
            end if
            // Else a normal character - keep scanning the command name
        
        // =====================================
        // Argument Parsing
        //   Argument parsing is a double step.  It consumes the
        //   argument as a whole word, then splits it up.
        //   This allows "--foo=blah" to be parsed even when quoted.
        else if stateStack[-1].state == 100 then
            // 100 == looking for an argument

            if c == ParsedCommand.CharClass.SE or c == "" then
                // semi-colon; end the command.
                endCmd()
                stateStack[-1].state = 0
    
            else if not ParsedCommand.CharClass.IsWhitespace(c) then
                // Found start of the argument.
                stateStack[-1].state = 101
                stateStack[-1].start = pos

                // Is there special handling?
                if c == ParsedCommand.CharClass.DL then
                    // "$".  Could be all manner of things.
                    stateStack.push({"state": 1000, "start": pos})
                else if c == ParsedCommand.CharClass.BS then
                    stateStack.push({"state": 200, "start": pos})
                else if c == ParsedCommand.CharClass.SQ then
                    stateStack.push({"state": 400, "start": pos})
                else if c == ParsedCommand.CharClass.DQ then
                    stateStack.push({"state": 300, "start": pos})
                else if c == ParsedCommand.CharClass.DL then
                    stateStack.push({"state": 1000, "start": pos})
                else if c == ParsedCommand.CharClass.BO then
                    stateStack.push({"state": 3000, "start": pos})
                end if
            end if
            // Else it's whitespace - keep searching for the start.
        
        else if stateStack[-1].state == 101 then
            // Inside an argument.
            if ParsedCommand.CharClass.IsWhitespace(c) then
                // End of the argument.
                stateStack[-1].args.push(text[stateStack[-1].start:pos])
                // Go back to searching for an argument start.
                stateStack[-1].state = 100

            else if c == ParsedCommand.CharClass.SE or c == "" then
                // semi-colon; end the argument & command.
                stateStack[-1].args.push(text[stateStack[-1].start:pos])
                endCmd()
                stateStack[-1].state = 0
    
            else if c == ParsedCommand.CharClass.DL then
                // "$".  Could be all manner of things.
                stateStack.push({"state": 1000, "start": pos})
            else if c == ParsedCommand.CharClass.BS then
                stateStack.push({"state": 200, "start": pos})
            else if c == ParsedCommand.CharClass.SQ then
                stateStack.push({"state": 400, "start": pos})
            else if c == ParsedCommand.CharClass.DQ then
                stateStack.push({"state": 300, "start": pos})
            else if c == ParsedCommand.CharClass.BO then
                stateStack.push({"state": 3000, "start": pos})
            end if
            // else keep scanning the argument.

        // =====================================
        // Escaped Character Parsing
        else if stateStack[-1].state == 200 then
            // 200 == found a '\'
            if ParsedCommand.CharClass.Escape.hasIndex(c) then
                c = ParsedCommand.CharClass.Escape[c]
            end if
            // else use it as-is.  Could also add unicode escaping...
            // Do some surgery.
            text = text[:stateStack[-1].start] + c + text[pos+1:]
            pos = stateStack[-1].start
            // And go back to where the parsing was.
            stateStack.pop()

        // =====================================
        // Double Quoted String Parsing
        else if stateStack[-1].state == 300 or stateStack[-1].state == 301 then
            // 300 == found a '"', on the first character in it.
            // 301 == Inside a '"'

            if stateStack[-1].state == 300 then
                // Do some surgery to eliminate the first '"' character,
                // so that the previous stack stuff will think it's just
                // a single text block.
                text = text[:stateStack[-1].start] + c + text[pos+1:]
                pos = stateStack[-1].start
                stateStack[-1].state = 301
            end if
            if c == ParsedCommand.CharClass.DL then
                // "$".  Env.
                stateStack.push({"state": 1000, "start": pos})
            else if c == ParsedCommand.CharClass.BS then
                stateStack.push({"state": 200, "start": pos})
            else if c == ParsedCommand.CharClass.DQ then
                // End of the double quote block.
                // Do some surgery to remove this character.
                text = text[:pos] + text[pos+1:]
                pos = pos - 1
                stateStack.pop()
            end if
            // Else it's consumed inside the double quote block.

        // =====================================
        // Single Quoted String Parsing
        else if stateStack[-1].state == 400 or stateStack[-1].state == 401 then
            // 400 == found a ''', on the first character in it.
            // 401 == Inside a '''

            if stateStack[-1].state == 400 then
                // Do some surgery to eliminate the first '"' character,
                // so that the previous stack stuff will think it's just
                // a single text block.
                text = text[:stateStack[-1].start] + c + text[pos+1:]
                pos = stateStack[-1].start
                stateStack[-1].state = 401
            end if

            if c == ParsedCommand.CharClass.BS then
                stateStack.push({"state": 200, "start": pos})
            else if c == ParsedCommand.CharClass.SQ then
                // End of the single quote block.
                // Do some surgery to remove this character.
                text = text[:pos] + text[pos+1:]
                pos = pos - 1
                stateStack.pop()
            end if
            // Else it's consumed inside the double quote block.
        
        // =====================================
        // $ Parsing
        else if stateStack[-1].state == 1000 then
            // 1000 == found a '$'
            if c == ParsedCommand.CharClass.CO then
                // ${} style.  The start is the next character.
                stateStack[-1].start = pos + 1
                stateStack[-1].state = 1100

            else if ParsedCommand.CharClass.IsWhitespace(c) then
                // Odd duck.  A stand-alone '$'.
                // Leave it alone, and keep the space parsing in the parent context.
                stateStack.pop()
                pos = pos - 1
            
            else
                // $BLAH style.
                stateStack[-1].start = pos
                stateStack[-1].state = 1010

            end if

        else if stateStack[-1].state == 1010 then
            // 1010 == $BLAH, in the word parsing.
            // Any special character will break us out of the parsing.
            if c == ParsedCommand.CharClass.BS then
                // Slip into \ handling.
                stateStack.push({"state": 200, "start": pos})
       
            else if c == ParsedCommand.CharClass.CC or
                    c == ParsedCommand.CharClass.SQ or
                    c == ParsedCommand.CharClass.DQ or
                    c == ParsedCommand.CharClass.PC or
                    c == ParsedCommand.CharClass.SE or
                    c == "" or
                    ParsedCommand.CharClass.IsWhitespace(c) then
                name = text[stateStack[-1].start:pos]
                if env.hasIndex(name) then
                    // Surgery to replace the text with the env value.
                    // At the same time, because this could be needing to add spaces,
                    // we'll reset our pointer.
                    // -1 to pos, because that's where the $ was.
                    text = text[:stateStack[-1].start - 1] + env[name] + text[pos:]
                    pos = stateStack[-1].start - 2
                    stateStack.pop()
                else
                    // Not found.  Just leave it in-text.
                    stateStack.pop()
                end if
            end if
            // Else it's valid to be in the env value.
        
        else if stateStack[-1].state == 1100 then
            // 1100 == inside the ${} parsing.
            if c == ParsedCommand.CharClass.BS then
                // Slip into \ handling.
                stateStack.push({"state": 200, "start": pos})

            // Could have special syntax handling inside ${} parsing...

            else if c == ParsedCommand.CharClass.CC then
                name = text[stateStack[-1].start:pos]
                if env.hasIndex(name) then
                    // Surgery to replace the text with the env value.
                    // At the same time, because this could be needing to add spaces,
                    // we'll reset our pointer.
                    // -2 to pos, because that's where the ${ was.
                    // +1 to pos, to swallow the "}".
                    text = text[:stateStack[-1].start - 2] + env[name] + text[pos+1:]
                    pos = stateStack[-1].start - 3
                    stateStack.pop()
                else
                    // Not found.  Just leave it in-text, as though it's part of a single word.
                    stateStack.pop()
                end if
            end if
        
        // =====================================
        // Sub-Command parsing
        else if stateStack[-1].state == 2000 then
            // 2000 == found a '('
            // NOT SUPPORTED NOW.
            stateStack.pop()
    
        // =====================================
        // Context Command parsing
        else if stateStack[-1].state == 3000 then
            // 3000 == found a '['
            if c == ParsedCommand.CharClass.BS then
                // Slip into \ handling.
                stateStack.push({"state": 200, "start": pos})
            
            else if c == ParsedCommand.CharClass.CN then
                // Found the first part, find the second.
                stateStack[-1].part1 = text[stateStack[-1].start+1:pos]
                stateStack[-1].nstart = pos + 1
                stateStack[-1].state = 3001

            else if c == ParsedCommand.CharClass.BC then
                // Simple format, which should be the context index.
                value = ParsedCommand.parseContext("", text[stateStack[-1].start+1:pos], "", context)

                if value != null then
                    // Surgery to replace the text with the context value.
                    // At the same time, because this could be needing to add spaces,
                    // we'll reset our pointer.
                    // +1 to pos, to swallow the "]".

                    text = text[:stateStack[-1].start] + value + text[pos+1:]
                    // -1 to advance to the start to continue parsing.
                    pos = stateStack[-1].start - 1
                end if
                stateStack.pop()
            end if
        
        else if stateStack[-1].state == 3001 then
            // 3001 == found a '[(blah):'
            if c == ParsedCommand.CharClass.BS then
                // Slip into \ handling.
                stateStack.push({"state": 200, "start": pos})
            
            else if c == ParsedCommand.CharClass.CN then
                // Found the second part, find the third.
                stateStack[-1].part2 = text[stateStack[-1].nstart:pos]
                stateStack[-1].nstart = pos + 1
                stateStack[-1].state = 3002

            else if c == ParsedCommand.CharClass.BC then
                // page:row format
                value = ParsedCommand.parseContext(stateStack[-1].part1, text[stateStack[-1].nstart:pos], "", context)

                if value != null then
                    // Surgery to replace the text with the context value.
                    // At the same time, because this could be needing to add spaces,
                    // we'll reset our pointer.
                    // +1 to pos, to swallow the "]".

                    text = text[:stateStack[-1].start] + value + text[pos+1:]
                    // -1 to advance to the start to continue parsing.
                    pos = stateStack[-1].start - 1
                end if
                stateStack.pop()
            end if

        else if stateStack[-1].state == 3002 then
            // 3002 == found a '[(blah):(blah):'; the last part.
            if c == ParsedCommand.CharClass.BS then
                // Slip into \ handling.
                stateStack.push({"state": 200, "start": pos})

            else if c == ParsedCommand.CharClass.BC then
                // page:row:field format
                value = ParsedCommand.parseContext(stateStack[-1].part1, stateStack[-1].part2, text[stateStack[-1].nstart:pos], context)

                if value != null then
                    // Surgery to replace the text with the context value.
                    // At the same time, because this could be needing to add spaces,
                    // we'll reset our pointer.
                    // +1 to pos, to swallow the "]".

                    text = text[:stateStack[-1].start] + value + text[pos+1:]
                    // -1 to advance to the start to continue parsing.
                    pos = stateStack[-1].start - 1
                end if
                stateStack.pop()
            end if
    
        end if


        pos = pos + 1
    end while
    if stateStack[-1].state != 0 then
        // This stateStack[-1].problems may not exist.
        ret.push(ParsedCommand.Command.New(null, [], stateStack[0].problems + ["Command did not terminate correctly."]))
    end if
    return ret
end function

ParsedCommand.parseContext = function(page, index, field, context)
    if page == "" or page == null then page = context.ActivePage
    oi = index
    if index isa string then
        index = index.to_int
    end if
    if not index isa number then return null
    if not context.Pages.hasIndex(page) then return null
    if field == "" or field == null then
        field = ""
        meta = context.PagesMeta[page]
        if meta.hasIndex("Default") then field = meta.Default
    end if
    page_list = context.Pages[page]
    if not page_list isa list then return null
    if index < 0 then
        index = page_list.len - index
    else
        // Index is base 1, not 0.
        index = index - 1
    end if
    if not page_list.hasIndex(index) then return null
    row = page_list[index]
    if not row.hasIndex(field) then return null
    return str(row[field])
end function
