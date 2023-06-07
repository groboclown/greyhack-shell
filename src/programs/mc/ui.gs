// Different terminal UI tools.

MenuChoice = {
    "Name": "unset",
    "Help": "no help available",
}

Terminal = {}
Terminal.New = function(session)
    ret = new Terminal
    ret.Session = session
    ret.Rows = 30
    ret.PromptRows = 4
    ret.Cols = 80
    ret.RemoveDuplicateHistories = true
    ret.Log = Console.New(30)
    ret.Stdout = ConsoleOut.New(ret.Log, "#808080")
    ret.Stderr = ConsoleOut.New(ret.Log, "#801010")
    return ret
end function

Terminal.LogLines = function()
    return self.Log.history
end function

Terminal.Prompt = function()
    clear_screen
    self.Session.Log.ShowHistory(self.Cols)
    s = ""
    for _ in range(1, self.Cols)
        s = s + "-"
    end for
    print "<color #104010>" + s + "</color>"
//    for idx in range(self.Session.CmdHistory.len - ret.PromptRows, self.Session.CmdHistory.len)
//        if idx >= 0 and idx < self.Session.CmdHistory.len then
//            print self.Session.Prompt + "<color #404040>" + self.Session.CmdHistory[idx] + "</color>"
//        end if
//    end for
    print "<color #804020>" + self.Session.RelCwd + "</color>"
    return user_input(self.Session.Prompt)
end function
