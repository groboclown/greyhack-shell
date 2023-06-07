// Test the parser.

//#require parser.gs
//#require format/formatted-str.gs
//#require errors.gs
//#require tests.gs

TestParse_empty = function(t)
    res = ParsedCommand.Parse("", {}, {})
    t.AssertEqual(res, [])
end function

TestParse_one_cmd = function(t)
    res = ParsedCommand.Parse("mycmd", {}, {})
    t.AssertDeepEqual(res, [
        ParsedCommand.Command.New("mycmd", [], []),
    ])    
end function

TestParse_two_cmds = function(t)
    res = ParsedCommand.Parse("mycmd ; other", {}, {})
    t.AssertDeepEqual(res, [
        ParsedCommand.Command.New("mycmd", [], []),
        ParsedCommand.Command.New("other", [], []),
    ])    
end function

TestParse_simple_args = function(t)
    res = ParsedCommand.Parse("mycmd is fun", {}, {})
    t.AssertDeepEqual(res, [
        ParsedCommand.Command.New("mycmd", [
            ParsedCommand.Argument.New(null, "is", null),
            ParsedCommand.Argument.New(null, "fun", null),
        ], []),
    ])    
end function

TestParse_named_args = function(t)
    res = ParsedCommand.Parse("mycmd --is --fun=yes", {}, {})
    t.AssertDeepEqual(res, [
        ParsedCommand.Command.New("mycmd", [
            ParsedCommand.Argument.New("is", true, null),
            ParsedCommand.Argument.New("fun", "yes", null),
        ], []),
    ])    
end function

TestParse_env = function(t)
    res = ParsedCommand.Parse("mycmd is ${abc} good", {"abc": "tuna"}, {})
    t.AssertDeepEqual(res, [
        ParsedCommand.Command.New("mycmd", [
            ParsedCommand.Argument.New(null, "is", null),
            ParsedCommand.Argument.New(null, "tuna", null),
            ParsedCommand.Argument.New(null, "good", null),
        ], []),
    ])    

    res = ParsedCommand.Parse("mycmd is $abc good", {"abc": "tuna"}, {})
    t.AssertDeepEqual(res, [
        ParsedCommand.Command.New("mycmd", [
            ParsedCommand.Argument.New(null, "is", null),
            ParsedCommand.Argument.New(null, "tuna", null),
            ParsedCommand.Argument.New(null, "good", null),
        ], []),
    ])    
end function

TestParse_context = function(t)
    res = ParsedCommand.Parse("mycmd is [1] good", {}, {"": [{"": "tuna"}]})
    t.AssertDeepEqual(res, [
        ParsedCommand.Command.New("mycmd", [
            ParsedCommand.Argument.New(null, "is", null),
            ParsedCommand.Argument.New(null, "tuna", null),
            ParsedCommand.Argument.New(null, "good", null),
        ], []),
    ])

    res = ParsedCommand.Parse("mycmd is [abc:2:name] good", {}, {"abc": [{}, {"name": "rat"}]})
    t.AssertDeepEqual(res, [
        ParsedCommand.Command.New("mycmd", [
            ParsedCommand.Argument.New(null, "is", null),
            ParsedCommand.Argument.New(null, "rat", null),
            ParsedCommand.Argument.New(null, "good", null),
        ], []),
    ])    
end function


if locals == globals then T.RunTests
