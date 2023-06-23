import_code("console.gs")
import_code("../errors.gs")
import_code("../tests.gs")
import_code("../format/formatted-str.gs")

// Unit tests for the console.

// SplitLines with an empty array.
TestConsole_SplitLines_empty = function(t)
    res = ContextLib.Console.SplitLines([])
    t.AssertDeepEqual([], res)
end function

// SplitLines split across lines, using the Console.Width value.
TestConsole_SplitLines_long_internalWidth = function(t)
    preWidth = ContextLib.Console.Width
    ContextLib.Console.Width = 10
    res = ContextLib.Console.SplitLines("1234567890abcdefghijABCDEFGHIJ")
    t.AssertDeepEqual([
        "1234567890",
        "abcdefghij",
        "ABCDEFGHIJ",
    ], res)

    ContextLib.Console.Width = preWidth
end function

// SplitLines split across lines, using width from the arguments.
TestConsole_SplitLines_long_width = function(t)
    t.AssertNotEqual(10, ContextLib.Console.Width)
    res = ContextLib.Console.SplitLines("1234567890abcdefghijABCDEFGHIJ", 10)
    t.AssertDeepEqual([
        "1234567890",
        "abcdefghij",
        "ABCDEFGHIJ",
    ], res)
end function

// SplitLines not split across line but with long formatting.
TestConsole_SplitLines_short_formatted = function(t)
    // only send 2 characters, but lots of formatting text.
    t.AssertNotEqual(5, ContextLib.Console.Width)
    res = ContextLib.Console.SplitLines([{"u": 1, "s": 1, "b": 1, "t": "ab"}], 5)
    t.AssertDeepEqual([
        "<u><s><b>ab</b></s></u>",
    ], res)
end function
