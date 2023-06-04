// Functions to help with CLI tools.

DEBUG = function(msg)
    print("<color=#606060> [DEBUG] " + msg + "</color>")
end function
INFO = function(msg)
    print("<color=#a0a0a0>" + msg + "</color>")
end function
ERROR = function(msg)
    if msg isa map and msg["Text"] isa string then
        print("<color=#f00000>" + msg["Text"] + "</color>")
    else
        print("<color=#f00000>" + msg + "</color>")
    end if
end function
