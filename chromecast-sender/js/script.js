var session = null;
var gameManagerClient = null;

var APP_ID = "DDCF8DA1";
var NAMESPACE = "urn:x-cast:com.puzzud.projects.chromecastapp";

function InitializeCastApi()
{
        var applicationId = APP_ID;

        var sessionRequest = new chrome.cast.SessionRequest(applicationId);
        var apiConfig = new chrome.cast.ApiConfig(sessionRequest, ChromecastSessionListener, ChromecastReceiverListener);
        
        chrome.cast.initialize(apiConfig, OnChromecastApiInitSuccess, OnChromecastApiInitError);
};

window.__onGCastApiAvailable = InitializeCastApi;

function ChromecastSessionListener(s)
{
        console.log("Chromecast session listener initialized.");
        
        session = s;

        if (session.media.length !== 0)
        {
                console.log('Found ' + session.media.length + ' sessions.');
        }
}

function ChromecastSessionUpdateListener(isAlive)
{
        var message = isAlive ? 'Session Updated' : 'Session Removed';
        message += ': ' + session.sessionId;
        console.log(message);

        if (!isAlive)
        {
          session = null;
        }
}

function OnChromecastRecieverMessage(namespace, message)
{
        console.log("receiverMessage: " + namespace + ", " + message);
}

function ChromecastReceiverListener(e)
{
        console.log("Chromecast receiver listener initialized.");

        if (e === "available")
        {
                console.log("Chromecast was found on network.");
        }
        else
        {
                console.log("No Chromecasts found on network.");
        }
}

function OnChromecastApiInitSuccess()
{
        console.log("Initialization succeeded.");

        // Create form with buttons to cast.
        InitializeChromecastUi();
}

function OnChromecastApiInitError()
{
        console.log("Initialization failed.");
}

function InitializeChromecastUi()
{
        /*
        <form>
                <button type="button" id="cast">Cast</button>
        </form>
        */

        var form = document.createElement("form");

        var castButton = document.createElement("button");
        castButton.setAttribute("id", "cast");
        castButton.innerHTML = "Cast";

        castButton.onclick =
        function()
        {
                RequestChromecastSession();

                return false;
        };

        form.appendChild(castButton);

        document.body.appendChild(form);

        SetUpButtonForCast(true);
}

function SetUpButtonForCast(enableCast)
{
        var castButton = document.getElementById("cast");

        if (enableCast)
        {
                castButton.innerHTML = "Cast";

                castButton.onclick =
                function()
                {
                        RequestChromecastSession();

                        return false;
                };
        }
        else
        {
                castButton.innerHTML = "Stop Cast";

                castButton.onclick =
                function()
                {
                        StopChromecastSession();

                        return false;
                };
        }
}

function RequestChromecastSession()
{
        console.log("Launching Chromecast session.");
        var e = chrome.cast.requestSession(OnRequestSessionSuccess, OnChromecastRequestSessionError);
}

function OnChromecastRequestSessionError(e)
{
        if (e.code === "cancel")
        {
                console.log("Connection to Chromecast was cancelled.");
        }
        else
        {
                console.error("Connection to Chromecast was unsuccessful.");
        }
}

function OnRequestSessionSuccess(s)
{
        console.log("Created Chromecast session with ID: " + s.sessionId);
        session = s;

        chrome.cast.games.GameManagerClient.getInstanceFor
        (
                session,
                function(result)
                {
                        console.log('### Game manager client initialized!');
                        gameManagerClient = result.gameManagerClient;
                        //cast.games.common.sender.debugGameManagerClient(gameManagerClient);

                        console.log('### Sending AVAILABLE message.');
                        gameManagerClient.sendPlayerAvailableRequest(null, null, null);
                },
                function(error)
                {
                        console.error('### Error initializing the game manager client: ' +
                        error.errorDescription + ' ' +
                        'Error code: ' + error.errorCode);
                }
        );

        session.addUpdateListener(ChromecastSessionUpdateListener);
        session.addMessageListener(NAMESPACE, OnChromecastRecieverMessage);

        SetUpButtonForCast(false);
}

function StopChromecastSession()
{
        if (session.status !== "stopped")
        {
                session.stop(OnChromecastStopSessionSuccess, OnChromecastStopSessionError);
        }
}

function OnChromecastStopSessionSuccess()
{
        console.log("Chromecast session stopped.");

        SetUpButtonForCast(true);
}

function OnChromecastStopSessionError()
{
        console.error("Error encountered while stopping Chromecast session.");
}
