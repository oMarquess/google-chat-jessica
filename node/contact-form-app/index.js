/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const express = require('express');
const PORT = process.env.PORT || 8080;

const app = express()
  .use(express.urlencoded({extended: false}))
  .use(express.json());

app.post('/', async (req, res) => {
  let event = req.body;

  let body = {};
  if (event.type === 'MESSAGE') {
    body = onMessage(event);
  } else if (event.type === 'CARD_CLICKED') {
    body = onCardClick(event);
  }

  return res.json(body);
});

/**
 * Responds to a MESSAGE interaction event in Google Chat.
 *
 * @param {Object} event the MESSAGE interaction event from Chat API.
 * @return {Object} message response that opens a dialog or sends private
 *                          message with text and card.
 */
function onMessage(event) {
  if (event.message.slashCommand) {
    switch (event.message.slashCommand.commandId) {
      case "1":
        // If the slash command is "/about", responds with a text message and button
        // that opens a dialog.
        return {
          text: "Manage your personal and business contacts 📇. To add a " +
                  "contact, use the slash command `/addContact`.",
          accessoryWidgets: [{
            // [START open_dialog_from_button]
            buttonList: { buttons: [{
              text: "Add Contact",
              onClick: { action: {
                function: "openInitialDialog",
                interaction: "OPEN_DIALOG"
              }}
            }]}
            // [END open_dialog_from_button]
          }]
        }
      case "2":
        // If the slash command is "/addContact", opens a dialog.
        return openInitialDialog();
    }
  }

  // If user sends the Chat app a message without a slash command, the app responds
  // privately with a text and card to add a contact.
  return {
    privateMessageViewer: event.user,
    text: "To add a contact, try `/addContact` or complete the form below:",
    cardsV2: [{
      cardId: "addContactForm",
      card: {
        header: { title: "Add a contact" },
        sections:[{ widgets: CONTACT_FORM_WIDGETS.concat([{
          buttonList: { buttons: [{
            text: "Review and submit",
            onClick: { action: { function : "openConfirmation" }}
          }]}
        }])}]
      }
    }]
  };
}

// [START subsequent_steps]
/**
 * Responds to CARD_CLICKED interaction events in Google Chat.
 *
 * @param {Object} event the CARD_CLICKED interaction event from Google Chat.
 * @return {Object} message responses specific to the dialog handling.
 */
function onCardClick(event) {
  // Initial dialog form page
  if (event.common.invokedFunction === "openInitialDialog") {
    return openInitialDialog();
  // Confirmation dialog form page
  } else if (event.common.invokedFunction === "openConfirmation") {
    return openConfirmation(event);
  // Submission dialog form page
  } else if (event.common.invokedFunction === "submitForm") {
    return submitForm(event);
  }
}

// [START open_initial_dialog]
/**
 * Opens the initial step of the dialog that lets users add contact details.
 *
 * @return {Object} a message with an action response to open a dialog.
 */
function openInitialDialog() {
  return { actionResponse: {
    type: "DIALOG",
    dialogAction: { dialog: { body: { sections: [{
      header: "Add new contact",
      widgets: CONTACT_FORM_WIDGETS.concat([{
        buttonList: { buttons: [{
          text: "Review and submit",
          onClick: { action: { function: "openConfirmation" }}
        }]}
      }])
    }]}}}
  }};
}
// [END open_initial_dialog]

/**
 * Returns the second step as a dialog or card message that lets users confirm details.
 *
 * @param {Object} event the interactive event with form inputs.
 * @return {Object} returns a dialog or private card message.
 */
function openConfirmation(event) {
  const name = fetchFormValue(event, "contactName") ?? "";
  const birthdate = fetchFormValue(event, "contactBirthdate") ?? "";
  const type = fetchFormValue(event, "contactType") ?? "";
  const cardConfirmation = {
    header: "Your contact",
    widgets: [{
      textParagraph: { text: "Confirm contact information and submit:" }}, {
      textParagraph: { text: "<b>Name:</b> " + name }}, {
      textParagraph: {
        text: "<b>Birthday:</b> " + convertMillisToDateString(birthdate)
      }}, {
      textParagraph: { text: "<b>Type:</b> " + type }}, {
      // [START set_parameters]
      buttonList: { buttons: [{
        text: "Submit",
        onClick: { action: {
          function: "submitForm",
          parameters: [{
            key: "contactName", value: name }, {
            key: "contactBirthdate", value: birthdate }, {
            key: "contactType", value: type
          }]
        }}
      }]}
      // [END set_parameters]
    }]
  };

  // Returns a dialog with contact information that the user input.
  if (event.isDialogEvent) {
    return { action_response: {
      type: "DIALOG",
      dialogAction: { dialog: { body: { sections: [ cardConfirmation ]}}}
    }};
  }

  // Updates existing card message with contact information that the user input.
  return {
    actionResponse: { type: "UPDATE_MESSAGE" },
    privateMessageViewer: event.user,
    cardsV2: [{
      card: { sections: [cardConfirmation]}
    }]
  }
}
// [END subsequent_steps]

/**
  * Validates and submits information from a dialog or card message
  * and notifies status.
  *
  * @param {Object} event the interactive event with parameters.
  * @return {Object} a message response that opens a dialog or posts a private
  *                  message.
  */
function submitForm(event) {
  // [START status_notification]
  const contactName = event.common.parameters["contactName"];
  // Checks to make sure the user entered a contact name.
  // If no name value detected, returns an error message.
  const errorMessage = "Don't forget to name your new contact!";
  if (!contactName && event.dialogEventType === "SUBMIT_DIALOG") {
    return { actionResponse: {
      type: "DIALOG",
      dialogAction: { actionStatus: {
        statusCode: "INVALID_ARGUMENT",
        userFacingMessage: errorMessage
      }}
    }};
  }
  // [END status_notification]
  if (!contactName) {
    return {
      privateMessageViewer: event.user,
      text: errorMessage
    };
  }

  // [START confirmation_success]
  // The Chat app indicates that it received form data from the dialog or card.
  // Sends private text message that confirms submission.
  const confirmationMessage = "✅ " + contactName + " has been added to your contacts.";
  if (event.dialogEventType === "SUBMIT_DIALOG") {
    return {
      actionResponse: {
        type: "DIALOG",
        dialogAction: { actionStatus: {
          statusCode: "OK",
          userFacingMessage: "Success " + contactName
        }}
      }
    };
  }
  // [END confirmation_success]
  // [START confirmation_message]
  return {
    actionResponse: { type: "NEW_MESSAGE" },
    privateMessageViewer: event.user,
    text: confirmationMessage
  };
  // [END confirmation_message]
}

/**
 * Extracts form input value for a given widget.
 *
 * @param {Object} event the CARD_CLICKED interaction event from Google Chat.
 * @param {String} widgetName a unique ID for the widget, specified in the widget's name field.
 * @returns the value inputted by the user, null if no value can be found.
 */
function fetchFormValue(event, widgetName) {
  const formItem = event.common.formInputs[widgetName];
  // For widgets that receive StringInputs data, the value input by the user.
  if (formItem.hasOwnProperty("stringInputs")) {
    const stringInput = event.common.formInputs[widgetName].stringInputs.value[0];
    if (stringInput != null) {
      return stringInput;
    }
  // For widgets that receive dateInput data, the value input by the user.
  } else if (formItem.hasOwnProperty("dateInput")) {
    const dateInput = event.common.formInputs[widgetName].dateInput.msSinceEpoch;
     if (dateInput != null) {
       return dateInput;
     }
  }

  return null;
}

/**
 * Converts date in milliseconds since epoch to user-friendly string.
 *
 * @param {Object} millis the milliseconds since epoch time.
 * @return {string} Display-friend date (English US).
 */
function convertMillisToDateString(millis) {
  const date = new Date(Number(millis));
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

app.listen(PORT, () => {
  console.log(`Server is running in port - ${PORT}`);
});

// [START input_widgets]
/**
 * The section of the contact card that contains the form input widgets. Used in a dialog and card message.
 * To add and preview widgets, use the Card Builder: https://addons.gsuite.google.com/uikit/builder
 */
const CONTACT_FORM_WIDGETS = [
  {
    "textInput": {
      "name": "contactName",
      "label": "First and last name",
      "type": "SINGLE_LINE"
    }
  },
  {
    "dateTimePicker": {
      "name": "contactBirthdate",
      "label": "Birthdate",
      "type": "DATE_ONLY"
    }
  },
  {
    "selectionInput": {
      "name": "contactType",
      "label": "Contact type",
      "type": "RADIO_BUTTON",
      "items": [
        {
          "text": "Work",
          "value": "Work",
          "selected": false
        },
        {
          "text": "Personal",
          "value": "Personal",
          "selected": false
        }
      ]
    }
  }
];
// [END input_widgets]
