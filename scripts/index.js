const checkForKey = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['quickcomm-key'], (result) => {
            resolve(result['quickcomm-key']);
        });
    });
};

const saveKey = () => {
    const input = document.getElementById('key_input');
    console.log(input.value);
    if (input) {
        // Encode String
        const encodedValue = encode(input.value);
        // Save to google storage
        chrome.storage.local.set({ 'quickcomm-key': encodedValue }, () => {
            document.getElementById('key_needed').style.display = 'none';
            document.getElementById('key_entered').style.display = 'block';
            getMessage()
                .then((msg) => getUnderstanding(msg))
                .then((res) => addUnderstanding(res));
        });
        // restart
        window.close();
    }
};

const encode = (input) => {
  return btoa(input);
};

const changeKey = () => {
    document.getElementById('key_needed').style.display = 'block';
    document.getElementById('key_entered').style.display = 'none';
};

document
    .getElementById('save_key_button')
    .addEventListener('click', saveKey);
document
  .getElementById('change_key_button')
  .addEventListener('click', changeKey);
//
// const sendMessage = async () => {
//     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//     let result;
//     try {
//         [{result}] = await chrome.scripting.executeScript({
//             target: { tabId:tab.id },
//             function: () => getSelection().toString(),
//         });
//         chrome.storage.local.set({ 'quickcomm-msg': result }, () => {
//             console.log("set message");
//         });
//     } catch (e) {
//         return;
//         console.log(e);
//     }
//   });
// };

const getMessage = async () => {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    try {
      const [{result}] = await chrome.scripting.executeScript({
          target: {tabId: tab.id},
          function: () => getSelection().toString(),
      });
      return result;
    } catch (e) {
      return null; // ignoring an unsupported page like chrome://extensions
    }
}

const fetchApi = async (body) => {
    const rawResponse = await fetch('https://t94oy28zle.execute-api.us-east-2.amazonaws.com/default/quickcomm', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: body
    });
    const content = await rawResponse.json();
    return content;
}

const getUnderstanding = async (message) => {
    if (message == undefined || message.length == 0) {
        return { error: "Please select some text in the browser to get started!" }
    }
    try {
        const body = JSON.stringify({
            key: apiKey, type: "understand", message: message
        })
        const content = await fetchApi(body);
        console.log(content);
        return content.result;
    }catch (e) {
        return { error: "Error: Could not summarize." }
    }
}

let messageRecord;

const addUnderstanding = (response) => {
    document.getElementById('understand_loading').style.display = 'none';
    document.getElementById('understand_content').style.display = 'block';
    if (response.error) {
        document.getElementById('sentiment_chip').style.display = 'none';
        document.getElementById("msg_summary").innerHTML = response.error;
    } else {
        messageRecord = response.record;
        document.getElementById("msg_summary").innerHTML = response.summary;
        document.getElementById("sentiment").innerHTML = response.sentiment;
    }
}


let apiKey;

checkForKey().then((response) => {
    if (response) {
        apiKey = atob(response);
        console.log(apiKey);
        document.getElementById('key_needed').style.display = 'none';
        document.getElementById('key_entered').style.display = 'block';
        getMessage()
            .then((msg) => getUnderstanding(msg))
            .then((res) => addUnderstanding(res));
    }
});



const getResponse = async (message, style) => {
    if (message == undefined || message.length == 0) {
        return { error: "Please select some text in the browser to get started!" }
    }
    document.getElementById('respond_loading').style.display = 'block';
    try {
        const body = JSON.stringify({
            key: apiKey, type: "respond", style:style, message: message, record: messageRecord
        });
        const content = await fetchApi(body);
        console.log(content);
        return content.result;
    } catch (e) {
        return { error: "Error: Could not generate response." }
    }
}

const addResponse = (response) => {
    document.getElementById('respond_loading').style.display = 'none';
    document.getElementById('respond_content').style.display = 'block';
    if (response.error) {
        document.getElementById("reply_textbox").value = response.error;
    } else {
        document.getElementById("reply_textbox").value = response.reply;
    }
}

const makeResponse = (sty) => {
    document.querySelectorAll('.respond').forEach((ee) => {
        (ee.name == sty) ? ee.classList.add('mdl-color--grey') : ee.classList.remove('mdl-color--grey');
    });
    // clear the existin response, if any
    document.getElementById("reply_textbox").value = '';
    console.log(sty);
    getMessage()
        .then((msg) => getResponse(msg, sty))
        .then((res) => addResponse(res))
    return;
}

document.querySelectorAll('.respond').forEach((elm) => {
    elm.addEventListener('click', (event) => makeResponse(elm.name))
});

const copyReply = async () => {
    // Get the text field
    var copyText = document.getElementById("reply_textbox");
    // Select the text field
    copyText.select();
    copyText.setSelectionRange(0, 99999); // For mobile devices
     // Copy the text inside the text field
    navigator.clipboard.writeText(copyText.value);
    document.querySelector('#copied_snackbar').MaterialSnackbar.showSnackbar({
        message: 'Copied!',
        timeout: 1000
    });
    if (messageRecord) {
        const body = JSON.stringify({
            key: apiKey, type: "copy", copied: copyText.value, record: messageRecord
        });
        const content = await fetchApi(body);
    }
}

document
    .getElementById('copy_reply')
    .addEventListener('click', copyReply);


const feedbackReply = async (event) => {
    // Get the text field
    var feedback = event.target.id == "thumbs_up" ? "up" : "down";
    console.log(feedback);
    document.querySelector('#copied_snackbar').MaterialSnackbar.showSnackbar({
        message: 'Thank you!',
        timeout: 1000
    });
    if (messageRecord) {
        const body = JSON.stringify({
            key: apiKey, type: "feedback", thumbs: feedback, record: messageRecord
        });
        const content = await fetchApi(body);
    }
}

document.querySelectorAll('.feedback_reply').forEach((elm) => {
    elm.addEventListener('click', feedbackReply)
});
