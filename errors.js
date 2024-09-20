
module.exports = {
	NotImplementedException: class extends Error {
		constructor() {
			super("Not implemented.");
		}
	},
	ErrCmdParams: class extends Error {
		constructor() {
			super("errCmdParams");
		}
	},
	AbortException: class extends Error {
		constructor() {
			super("Command aborted.");
		}
	},
}