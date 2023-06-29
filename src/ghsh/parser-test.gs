// Test the parser.

import_code("parser.gs")
import_code("../libs/errors.gs")
import_code("../libs/tests.gs")

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
            ParsedCommand.Command.New("mycmd", ["is", "fun"], []),
        ],
        res)
end function

TestParse_named_args = function(t)
    res = ParsedCommand.Parse("mycmd --is --fun=yes", {}, {})
    t.AssertDeepEqual(
        [
            ParsedCommand.Command.New("mycmd", ["--is", "--fun=yes"], []),
        ],
        res)
end function

TestParse_example1 = function(t)
    res = ParsedCommand.Parse("+ ?", {}, {})
    t.AssertDeepEqual(
        [
            ParsedCommand.Command.New("+", ["?"], []),
        ],
        res)
end function

TestParse_env = function(t)
    res = ParsedCommand.Parse("mycmd is ${abc} good", {"abc": "tuna"}, {})
    t.AssertDeepEqual(
        [
            ParsedCommand.Command.New("mycmd", ["is", "tuna", "good"], []),
        ],
        res)

    res = ParsedCommand.Parse("mycmd is $abc good", {"abc": "tuna"}, {})
    t.AssertDeepEqual(
        [
            ParsedCommand.Command.New("mycmd", ["is", "tuna", "good"], []),
        ],
        res)
end function

TestParse_context = function(t)
    context = {"ActivePage": "f", "Pages": {"f": [{"a": "tuna"}]}, "PagesMeta": {"f": {"Default": "a"}}}
    res = ParsedCommand.Parse("mycmd is [1] good", {}, context)
    t.AssertDeepEqual(
        [
            ParsedCommand.Command.New("mycmd", ["is", "tuna", "good"], []),
        ],
        res)

    context.Pages.abc = [{}, {"name": "rat"}]
    context.PagesMeta.abc = {"Default": "x"}
    res = ParsedCommand.Parse("mycmd is [abc:2:name] good", {}, context)
    t.AssertDeepEqual(
        [
            ParsedCommand.Command.New("mycmd", ["is", "rat", "good"], []),
        ],
        res)
end function

if locals == globals then T.RunTests
