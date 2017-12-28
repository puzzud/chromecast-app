var session = null;

function ScanForCastApi()
{
        var loadCastInterval = setInterval(
        function()
        {
                if (chrome.cast.isAvailable)
                {
                        console.log("Chromecast API is available.");
                        clearInterval(loadCastInterval);

                        InitializeCastApi();
                }
                else
                {
                        console.log("Chromecast API is not available.");
                }
        }, 1000);
};

function InitializeCastApi()
{
        var applicationId = chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;
        var sessionRequest = new chrome.cast.SessionRequest(applicationId);
        var apiConfig = new chrome.cast.ApiConfig(sessionRequest, ChromeCastSessionListener, ChromecastReceiverListener);
        
        chrome.cast.initialize(apiConfig, OnChromecastApiInitSuccess, OnChromecastApiInitError);
};

function ChromeCastSessionListener(s)
{
        console.log("Chromecast session listener initialized.");
        
        session = s;

        if (session.media.length !== 0)
        {
                console.log('Found ' + session.media.length + ' sessions.');
        }
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
        console.log("Initialization succeeded");

        // Create form with buttons to cast.
        InitializeChromecastUi();
}

function OnChromecastApiInitError()
{
        console.log("Initialization failed");
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

        ChromecastLoadMedia();

        SetUpButtonForCast(false);
}

function ChromecastLoadMedia()
{
        if (session === null)
        {
                // NOTE: This situation should not happen.
                console.error("No session found to load media.");
                return;
        }

        var mediaInfo = new chrome.cast.media.MediaInfo("http://i.imgur.com/IFD14.jpg");
        mediaInfo.contentType = "image/jpg";
  
        var mediaLoadRequest = new chrome.cast.media.LoadRequest(mediaInfo);
        mediaLoadRequest.autoplay = false;

        session.loadMedia(mediaLoadRequest, OnChromecastMediaLoadSuccess, OnChromecastMediaLoadError);
}

function OnChromecastMediaLoadSuccess()
{
        console.log("Successfully loaded image.");
}

function OnChromecastMediaLoadError()
{
        console.log("Failed to load image.");
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
