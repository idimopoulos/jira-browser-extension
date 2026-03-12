(function () {
  const form = document.getElementById("instance-form");
  const idInput = document.getElementById("instance-id");
  const nameInput = document.getElementById("instance-name");
  const baseUrlInput = document.getElementById("instance-base-url");
  const installationInput = document.getElementById("instance-installation");
  const loginInput = document.getElementById("instance-login");
  const authTypeInput = document.getElementById("instance-auth-type");
  const accessKeyInput = document.getElementById("instance-access-key");
  const cancelButton = document.getElementById("cancel-edit");
  const messageEl = document.getElementById("settings-message");
  const instanceList = document.getElementById("instance-list");
  const template = document.getElementById("instance-template");

  function sendMessage(message) {
    return chrome.runtime.sendMessage(message).then(function (response) {
      if (!response || !response.ok) {
        throw new Error(response && response.error ? response.error : "Settings request failed");
      }

      return response.data;
    });
  }

  function setMessage(text, isError) {
    messageEl.textContent = text || "";
    messageEl.className = "message-line" + (text ? (isError ? " error-text" : " success-text") : "");
  }

  function resetForm() {
    idInput.value = "";
    nameInput.value = "";
    baseUrlInput.value = "";
    installationInput.value = "cloud";
    loginInput.value = "";
    authTypeInput.value = "basic";
    accessKeyInput.value = "";
    setMessage("", false);
  }

  function populateForm(instance) {
    idInput.value = instance.id;
    nameInput.value = instance.name;
    baseUrlInput.value = instance.baseUrl;
    installationInput.value = instance.installation || "cloud";
    loginInput.value = instance.login || "";
    authTypeInput.value = instance.authType || "basic";
    accessKeyInput.value = instance.accessKey || "";
    setMessage("Editing existing instance.", false);
  }

  async function renderInstances() {
    instanceList.innerHTML = "";
    const instances = await sendMessage({ type: "storage:getInstances" });

    if (!instances.length) {
      instanceList.textContent = "No Jira instances configured yet.";
      return;
    }

    instances.forEach(function (instance) {
      const fragment = template.content.cloneNode(true);
      const nameEl = fragment.querySelector(".instance-name");
      const urlEl = fragment.querySelector(".instance-url");
      const editButton = fragment.querySelector(".edit-instance-button");
      const deleteButton = fragment.querySelector(".delete-instance-button");

      nameEl.textContent = instance.name;
      urlEl.textContent = instance.baseUrl;

      editButton.addEventListener("click", function () {
        populateForm(instance);
      });

      deleteButton.addEventListener("click", async function () {
        try {
          await sendMessage({
            type: "storage:deleteInstance",
            instanceId: instance.id
          });
          resetForm();
          setMessage("Instance deleted.", false);
          await renderInstances();
        } catch (error) {
          setMessage(error.message, true);
        }
      });

      instanceList.appendChild(fragment);
    });
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      const instance = {
        id: idInput.value || undefined,
        name: nameInput.value,
        baseUrl: baseUrlInput.value,
        installation: installationInput.value,
        login: loginInput.value,
        authType: authTypeInput.value,
        accessKey: accessKeyInput.value
      };

      await sendMessage({
        type: "storage:saveInstance",
        instance: instance
      });

      resetForm();
      setMessage("Instance saved.", false);
      await renderInstances();
    } catch (error) {
      setMessage(error.message, true);
    }
  });

  cancelButton.addEventListener("click", function () {
    resetForm();
  });

  renderInstances().catch(function (error) {
    setMessage(error.message, true);
  });
})();
