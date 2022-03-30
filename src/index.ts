import joplin from 'api';
import { SettingItemType, ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function() {

		const dialogs = joplin.views.dialogs;
		const dialog = await dialogs.create('tags_dialog');
		await joplin.views.dialogs.addScript(dialog, 'modal_view.js');
		await joplin.views.dialogs.addScript(dialog, 'modal_view.css');
		await dialogs.setButtons(dialog, [
			{
				id: 'ok',
				title: 'Add'
			},
			{
				id: 'save',
				title: 'Save custom tag'
			},
			{
				id: 'cancel',
				title: 'Cancel'
			}
		]);

		////////////////// SETTINGS //////////////////
		
		await joplin.settings.registerSection('settings.quickHTMLtags', {
			label: 'Quick HTML tags',
			iconName: 'fas fa-code'
		});
		
		await joplin.settings.registerSettings({
			'tags': {
				value: "",
				type: SettingItemType.String,
				section: 'settings.quickHTMLtags',
				public: true,
				label: 'HTML predefined tags',
				description: 'Insert your predefined HTML tags here, seperated by semicolon ;'
			},
			'enable_newlines': {
				value: false,
				type: SettingItemType.Bool,
				section: 'settings.quickHTMLtags',
				public: true,
				label: 'Enable new line breaking',
				description: 'Enable new line breaking when selected text contains newlines. Inserts newlines at the front and back so that it renders correctly.'
			},
			'enable_markdown': {
				value: false,
				type: SettingItemType.Bool,
				section: 'settings.quickHTMLtags',
				public: true,
				label: 'Enable markdown inside tags',
				description: 'Enables markdown styling inside HTML tags.'
			}
		});

		////////////////// BUTTONS, SHORTCUTS, COMMANDS //////////////////

		// Create a HTML quick command
		await joplin.commands.register({
			name: 'insert_quick_HTML_tag',
			label: 'Quick HTML tag',
			iconName: 'fas fa-code',
			execute: async () => {
				
				// Collect settings
				const settings_tags = await joplin.settings.value('tags') as string;
				const settings_newlines = await joplin.settings.value('enable_newlines') as boolean;
				const settings_md = await joplin.settings.value('enable_markdown') as boolean;

				var selectedText = await joplin.commands.execute('selectedText') as string;
				
				// Determine whether the selected text is inline or not
				// Add newline in front and back (so that the tag will render)
				let newlines = settings_newlines && /\r|\n/.exec(selectedText);
				if (newlines) {
					selectedText = "\n\n" + selectedText + "\n";
				}

				await dialogs.setHtml(dialog, generateDialogContext(settings_tags.split(";")));

				
				const result = await dialogs.open(dialog);
				var res = result.formData.tag;
				
				if (result.id == "save" && res.custom_tag) {
					await joplin.settings.setValue('tags', settings_tags === "" ? res.custom_tag : settings_tags + ";" + res.custom_tag);
					await joplin.commands.execute('editor.focus');
					return;
				} else if (result.id == "cancel") {
					await joplin.commands.execute('editor.focus');
					return;
				}

				let tag = res.custom_tag ? res.custom_tag : res.pretag;
				
				if(!tag){
					tag='div'
				}

				let newSection;

				if(res.attribute=='none'){
					newSection=`${newlines ? "\n" : ""}<${tag}${settings_md ? " markdown=1" : ""}>${selectedText.length > 1 ? selectedText : ""}</${tag}>${newlines ? "\n" : ""}`;
				}else{
					newSection=`${newlines ? "\n" : ""}<${tag}${settings_md ? " markdown=1" : ""} ${res.attribute}="${res.attrValue}">${selectedText.length > 1 ? selectedText : ""}</${tag}>${newlines ? "\n" : ""}`
				}

				await joplin.commands.execute('replaceSelection',newSection);
				await joplin.commands.execute('editor.focus');
			}
		});

		// Create a toolbar button
		await joplin.views.toolbarButtons.create('insert_quick_HTML_tag', 'insert_quick_HTML_tag', ToolbarButtonLocation.EditorToolbar);
		
		// Create a command shortcut
		await joplin.views.menus.create('quick_HTML_tag', 'Insert HTML tag', [
			{
				commandName: 'insert_quick_HTML_tag',
				accelerator: 'Ctrl+H'
			}
		]);

	},
});

function generateDialogContext(tags : String[]) : string {
	
	let pretags:string;

	if (tags.length == 1 && tags[0] === "") {
		pretags = "<p>You can save a custom one here or set them under:<br><code>Tools > Options > Quick HTML tags</code></p>"
	} else {
		pretags = `<label for="pretags">Choose a tag:</label><select name="pretag" id="pretags">`;
		tags.forEach(tag => pretags += tag !== "" ? `<option value=${tag}>${tag}</option>` : "");
		pretags += "</select>"
	};

	return `
	<h2>Quick HTML tags</h2>
	<form id="qt_form" name="tag">
		${pretags}
		<br>
		<label for="custom_tag">Enter custom tag:</label>
		<input id="ctag" type="text" name="custom_tag"/>
		<br>
		<h3>set attribute</h3>
		<select name="attribute" id="attr">
			<option value="none">none</option>
            <option value="style">style</option>
            <option value="id">id</option>
            <option value="class">class</option>
        </select>
        <label for="attrValue">Enter Attribute Value:</label>
        <input type="text" name="attrValue">
	</form>`;
}