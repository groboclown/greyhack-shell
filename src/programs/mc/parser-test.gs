// Test the parser.

import_code("parser.gs")
import_code("../../libs/errors.gs")
import_code("../../libs/tests.gs")

TestParse_empty = function(t)
    res = ParsedCommand.Parse("", {}, {})
    t.AssertEqual(res, [])
end function

TestParse_one_cmd = function(t)
    res = ParsedCommand.Parse("mycmd", {}, {})
    t.AssertDeepEqual(
        [
            ParsedCommand.Command.New("mycmd", [], []),
        ],
        res)
end function

TestParse_two_cmds = function(t)
    res = ParsedCommand.Parse("mycmd ; other", {}, {})
    t.AssertDeepEqual(
        [
            ParsedCommand.Command.New("mycmd", [], []),
            ParsedCommand.Command.New("other", [], []),
        ],
        res)
end function

TestParse_simple_args = function(t)
    res = ParsedCommand.Parse("mycmd is fun", {}, {})
    t.AssertDeepEqual(
        [
            ParsedCommand.Command.New("mycmd", [
                ParsedCommand.Argument.New(null, "is", null, "is"),
                ParsedCommand.Argument.New(null, "fun", null, "fun"),
            ], []),
        ],
        res)
end function

TestParse_named_args = function(t)
    res = ParsedCommand.Parse("mycmd --is --fun=yes", {}, {})
    t.AssertDeepEqual(
        [
            ParsedCommand.Command.New("mycmd", [
                ParsedCommand.Argument.New("is", true, null, "--is"),
                ParsedCommand.Argument.New("fun", "yes", null, "--fun=yes"),
            ], []),
        ],
        res)
end function

TestParse_example1 = function(t)
    res = ParsedCommand.Parse("+ ?", {}, {})
    t.AssertDeepEqual(
        [
            ParsedCommand.Command.New("+", [
                ParsedCommand.Argument.New(null, "?", null, "?"),
            ], []),
        ],
        res)
end function

TestParse_env = function(t)
    res = ParsedCommand.Parse("mycmd is ${abc} good", {"abc": "tuna"}, {})
    t.AssertDeepEqual(
        [
            ParsedCommand.Command.New("mycmd", [
                ParsedCommand.Argument.New(null, "is", null, "is"),
                ParsedCommand.Argument.New(null, "tuna", null, "tuna"),
                ParsedCommand.Argument.New(null, "good", null, "good"),
            ], []),
        ],
        res)

    res = ParsedCommand.Parse("mycmd is $abc good", {"abc": "tuna"}, {})
    t.AssertDeepEqual(
        [
            ParsedCommand.Command.New("mycmd", [
                ParsedCommand.Argument.New(null, "is", null, "is"),
                ParsedCommand.Argument.New(null, "tuna", null, "tuna"),
                ParsedCommand.Argument.New(null, "good", null, "good"),
            ], []),
        ],
        res)
end function

TestParse_context = function(t)
    context = {"ActivePage": "f", "Pages": {"f": [{"a": "tuna"}]}, "PagesMeta": {"f": {"Default": "a"}}}
    res = ParsedCommand.Parse("mycmd is [1] good", {}, context)
    t.AssertDeepEqual(
        [
            ParsedCommand.Command.New("mycmd", [
                ParsedCommand.Argument.New(null, "is", null, "is"),
                ParsedCommand.Argument.New(null, "tuna", null, "tuna"),
                ParsedCommand.Argument.New(null, "good", null, "good"),
            ], []),
        ],
        res)

    context.Pages.abc = [{}, {"name": "rat"}]
    context.PagesMeta.abc = {"Default": "x"}
    res = ParsedCommand.Parse("mycmd is [abc:2:name] good", {}, context)
    t.AssertDeepEqual(
        [
            ParsedCommand.Command.New("mycmd", [
                ParsedCommand.Argument.New(null, "is", null, "is"),
                ParsedCommand.Argument.New(null, "rat", null, "rat"),
                ParsedCommand.Argument.New(null, "good", null, "good"),
            ], []),
        ],
        res)
end function

if locals == globals then T.RunTests
