// The User's Session object.

UserSession = {}

UserSession.New = function()
    ret = new UserSession
    ret.User = active_user
    ret.Home = home_dir
    ret.Shell = get_shell
    ret.Host = get_shell.host_computer
    ret.Cwd = home_dir
    ret.Prompt = "<color=#006000>$</color> "
    ret.CPrompt = "> "
    ret.CmdHistory = []
    ret.Aliases = {}
    ret.Env = {}
    ret.DirSep = "/"
    ret.PathSep = ":"
    ret.CmdHistoryDepth = 60
    ret.SaveDuplicateCmds = false
    return ret
end function

UserSession.RelCwd = function()
    if self.Cwd == self.Home then return "~"
    if self.Cwd[self.Home.len + 1:] == self.Home + "/" then
        return "~" + self.Cwd[self.Home.len:]
    end if
    return self.Cwd
end function

UserSession.AddCmdToHistory = function(cmd)
    if not self.SaveDuplicateCmds and self.CmdHistory[-1] == cmd then return
    self.CmdHistory.push(cmd)
    if self.CmdHistory.len > self.CmdHistoryDepth then
        self.CmdHistory = self.CmdHistory[self.CmdHistoryDepth - self.CmdHistory.len:]
    end if
end function
