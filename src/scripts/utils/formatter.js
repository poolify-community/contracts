
const customConsole = {
    log:(x) => console.log(x),
    error:(x) => console.log('\x1b[31m%s\x1b[0m',x)
}


module.exports = customConsole;