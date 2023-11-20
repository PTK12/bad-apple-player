import * as vscode from "vscode";
const data: {[key: string]: any} = require("./../data.json");

function generateDecorations(): [vscode.TextEditorDecorationType, vscode.TextEditorDecorationType] {
	let opacity = vscode.workspace.getConfiguration("bad-apple-vscode-player").get("opacity", 1);
	let textOpacity = vscode.workspace.getConfiguration("bad-apple-vscode-player").get("textOpacity", 1);

	let dark = vscode.window.createTextEditorDecorationType({backgroundColor: `rgba(0, 0, 0, ${opacity})`, opacity: `${textOpacity}`});
	let light = vscode.window.createTextEditorDecorationType({backgroundColor: `rgba(255, 255, 255, ${opacity})`, opacity: `${textOpacity}`});

	return [dark, light];
}

function generateFrame(i: number, offset: number) {
	let frame = data.frames[i];
	let newFrame: [vscode.Range[], vscode.Range[]] = [[], []];
	for (let row = 0; row < frame.length; row++) {
		for (let j = 0; j < frame[row][1].length - 1; j++){
			newFrame[(j & 1) ^ frame[row][0]].push(new vscode.Range(
				row + offset, frame[row][1][j],
				row + offset, frame[row][1][j + 1]
			));
		}
	}
	return newFrame;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function frameSync(fps: number) {
	let frameTime = 1000/fps;
	let time = new Date();

	await sleep(frameTime - time.getMilliseconds() % frameTime);
}

let killSignal = false;

export function activate(context: vscode.ExtensionContext) {
	let pad = vscode.commands.registerTextEditorCommand("bad-apple-vscode-player.pad", async function () {
		let editor = vscode.window.activeTextEditor;
		if (editor === undefined) {return;}

		let edits: [vscode.Position, string][] = [];
		let lines = editor.document.lineCount;

		for (let n = 0; n < lines; n++) {
			let line = editor.document.lineAt(n);
			if (line.text.length >= 80) {continue;}
			let text = " ".repeat(80 - line.text.length);
			edits.push([line.range.end, text]);
		}

		if (lines < 30) {
			edits[lines - 1][1] += Array(30 - lines).fill("\n" + " ".repeat(80)).join("");
		}
		editor.edit(editBuilder => {edits.map(x => editBuilder.insert(...x));});
	});

	context.subscriptions.push(pad);

	let play = vscode.commands.registerCommand("bad-apple-vscode-player.play", async function () {
		killSignal = false;
		let fps = vscode.workspace.getConfiguration("bad-apple-vscode-player").get("targetFrames", 15);
		let switchEditor = vscode.workspace.getConfiguration("bad-apple-vscode-player").get("switchEditor", false);
		let decorations = generateDecorations();
		let editor = vscode.window.activeTextEditor;

		let editorHandler = switchEditor ? vscode.window.onDidChangeActiveTextEditor((e) => {
			editor?.setDecorations(decorations[0], []);
			editor?.setDecorations(decorations[1], []);
			editor = e;
			offset = e?.visibleRanges[0].start.line || 0;
		}) : undefined;

		if (editorHandler === undefined && switchEditor === undefined) {
			vscode.window.showErrorMessage("Unable to use active text editor.");
			return; // Early return to avoid computation
		}

		let offset = editor === undefined ? 0 : editor.visibleRanges[0].start.line;
		let lineHandler = vscode.window.onDidChangeTextEditorVisibleRanges((e) => {
			if (e.textEditor === editor) {offset = e.visibleRanges[0].start.line;}
		});

		for (let i = 0; i < data["n"]; i += 30/fps) {
			let frame = generateFrame(Math.round(i), offset);
			editor?.setDecorations(decorations[0], frame[0]);
			editor?.setDecorations(decorations[1], frame[1]);
			await frameSync(fps);
			if (killSignal) {break;}
		}

		editor?.setDecorations(decorations[0], []);
		editor?.setDecorations(decorations[1], []);

		lineHandler.dispose();
		if (switchEditor) {editorHandler?.dispose();}
	});

	context.subscriptions.push(play);

	let kill = vscode.commands.registerCommand("bad-apple-vscode-player.kill", async function () {
		killSignal = true;
	});

	context.subscriptions.push(kill);
}

export function deactivate() {}
