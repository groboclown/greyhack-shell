// Stream Simulation

OutputStream = {}

OutputStream.write = function(value)
    exit(self._isa + ".write not implemented")
end function

OutputStream.write_line = function(line)
    self.write(line + char(10))
end function

OutputStream.write_text = function(text)
    LF = char(10)
    CR = char(13)
    start_line = 0
    last_non_eol = 0
    last = " "
    for pos in text.indexes
        c = text[pos]
        if c == LF or (c == CR and last == CR) then
            // (something)LF or CRCR
            self.write_line(text[start_line:last_non_eol])
            start_line = pos + 1
            last_non_eol = start_line
        else if c != CR and last == CR then
            // CR(non-eol)
            self.write_line(text[start_line:last_non_eol])
            start_line = pos
            last_non_eol = pos
        else if c != CR then
            // (something)(something)
            last_non_eol = pos
        end if
        // else (something)CR
        //   means delay constructing a line.
    end for
    if start_line < text.len then
        self.write_line(text[start_line:last_non_eol])
    end if
end function

OutputStream.Print = function(text)
    self.write_text(text)
end function

OutputStream.Println = function(text)
    self.write_text(text + char(10))
end function

OutputStream.FPrint = function(text, paramMap)
    self.write_text(FormatStr.PyFormat(text, paramMap))
end function

Console = {}
Console.New = function(color, historyDepth=30)
    ret = new Console
    ret.historyDepth = historyDepth
    ret.history = []
    ret.historyColor = []
    return ret
end function
Console.enforceDepth = function()
    if self.history.len > self.historyDepth then self.history = self.history[self.history.len - self.historyDepth:]
    if self.historyColor.len > self.historyDepth then self.historyColor = self.historyColor[self.historyColor.len - self.historyDepth:]
end function
Console.SetDepth = function(depth)
    self.historyDepth = depth
    self.enforceDepth()
end function
Console.ShowLine = function(color, text)
    print("<color " + color + ">" + text + "</color>")
end function
Console.AddLine = function(color, text)
    if self.historyDepth > 0 then
        self.history.push(text)
        self.historyColor.push(self.color)
        self.enforceDepth()
    end if
end function
Console.Writeln = function(color, text)
    self.add_line(color, text)
    self.show_line(color, text)
end function
Console.ShowHistory = function(maxColumns)
    for line in self.history
        if maxColumns != null and line.len > maxColumns then
            line = line[:maxColumns]
        end if
        self.show_line(line)
    end for
end function

ConsoleOut = new OutputStream
ConsoleOut.New = function(console, color)
    ret = new ConsoleOut
    ret.color = color
    ret.console = console
end function
ConsoleOut.write_line = function(text)
    self.console.Writeln(self.color, text)
end function
