import_code("cli-helper.gs")
import_code("console.gs")
import_code("../errors.gs")
import_code("../tests.gs")
import_code("../format/formatted-str.gs")
import_code("get.gs")
import_code("session.gs")
import_code("pages-create.gs")
import_code("pages-send.gs")

// Unit tests for the console.

// SplitStyledLines with an empty array.
TestCli_SendHelpText_multiline = function(t)
    origWidth = ContextLib.Console.Width
    context = {
        "Pages": {ContextLib.Cli.HelpPage.Name: []},
        "PagesMeta": {ContextLib.Cli.HelpPage.Name: {}},
    }
    ContextLib.Console.Width = 5
    ContextLib.Cli.SendHelpText(context, {
        "command": "c1",
        "section": "s1",
        "kind": "p",
        "text": "1234567890",
    })
    t.AssertDeepEqual([
        {
            "command": "c1",
            "section": "s1",
            "kind": "-",
            "text": "",
        },
        {
            "command": "c1",
            "section": "s1",
            "kind": "p",
            "text": "12345",
        },
        {
            "command": "c1",
            "section": "s1",
            "kind": "p",
            "text": "67890",
        },
    ], context.Pages.help)

    ContextLib.Console.Width = origWidth
end function

if locals == globals then T.RunTests
