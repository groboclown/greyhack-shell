import_code("console.gs")
import_code("../errors.gs")
import_code("../tests.gs")
import_code("../format/formatted-str.gs")

// Unit tests for the console.

// SplitStyledLines with an empty array.
TestConsole_SplitStyledLines_empty = function(t)
    res = ContextLib.Console.SplitStyledLines([])
    t.AssertDeepEqual([], res)
end function

// SplitStyledLines split across lines, using the Console.Width value.
TestConsole_SplitStyledLines_long_internalWidth = function(t)
    preWidth = ContextLib.Console.Width
    ContextLib.Console.Width = 10
    res = ContextLib.Console.SplitStyledLines("1234567890abcdefghijABCDEFGHIJ")
    t.AssertDeepEqual([
        "<noparse>1234567890</noparse>",
        "<noparse>abcdefghij</noparse>",
        "<noparse>ABCDEFGHIJ</noparse>",
    ], res)

    ContextLib.Console.Width = preWidth
end function

// SplitStyledLines split across lines, using width from the arguments.
TestConsole_SplitStyledLines_long_width = function(t)
    t.AssertNotEqual(10, ContextLib.Console.Width)
    res = ContextLib.Console.SplitStyledLines("1234567890abcdefghijABCDEFGHIJ", 10)
    t.AssertDeepEqual([
        "<noparse>1234567890</noparse>",
        "<noparse>abcdefghij</noparse>",
        "<noparse>ABCDEFGHIJ</noparse>",
    ], res)
end function

// SplitStyledLines not split across line but with long formatting.
TestConsole_SplitStyledLines_short_formatted = function(t)
    // only send 2 characters, but lots of formatting text.
    t.AssertNotEqual(5, ContextLib.Console.Width)
    res = ContextLib.Console.SplitStyledLines([{"u": 1, "s": 1, "b": 1, "t": "ab"}], 5)
    t.AssertDeepEqual([
        "<u><s><b><noparse>ab</noparse></b></s></u>",
    ], res)
end function

// ApplyStyle with just color
TestConsole_ApplyStyle_just_color = function(t)
    res = ContextLib.Console.ApplyStyle("sample", {"c": "1"})
    t.AssertDeepEqual(
        {"t": "sample", "c": "1"},
        res)
end function

if locals == globals then T.RunTests
