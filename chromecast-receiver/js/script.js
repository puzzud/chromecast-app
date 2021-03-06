SpriteDemoGame = function(gameManager)
{
  this.gameManager_ = gameManager;

  /**
   * Debug only. Call debugUi.open() or close() to show and hide an overlay
   * showing game manager and player information while testing and debugging.
   */
  //this.debugUi = new cast.receiver.games.debug.DebugUI(this.gameManager_);

  this.canvasWidth_ = window.innerWidth;
  this.canvasHeight_ = window.innerHeight;
  this.sprites_ = [];
  this.spriteVelocities_ = [];
  this.numberSpritesAdded_ = 0;
  this.backgroundPosition_ = 0;
  this.background_ = null;

  // Background wrap-around texture to fake a infinite scrolling effect.
  this.backgroundWrap_ = null;

  // Pre-bound call to #update.
  this.boundUpdateFunction_ = this.update_.bind(this);
  
  this.isLoaded_ = false;
  this.isRunning_ = false;
  
  this.container_ = new PIXI.Container();
  
  //this.renderer_ = new PIXI.WebGLRenderer(this.canvasWidth_, this.canvasHeight_);
  this.renderer_ = new PIXI.CanvasRenderer(this.canvasWidth_, this.canvasHeight_);

  this.loader_ = new PIXI.loaders.Loader();
  this.loader_.add('assets/icon.png');
  this.loader_.add('assets/background.jpg');
  this.loader_.once('complete', this.onAssetsLoaded_.bind(this));

  // Callback used with #run.
  this.loadedCallback_ = null;

  // Pre-bound custom message callback.
  this.boundGameMessageCallback_ = this.onGameMessage_.bind(this);

  // Pre-bound player connect callback.
  this.boundPlayerAvailableCallback_ = this.onPlayerAvailable_.bind(this);

  // Pre-bound player quit callback.
  this.boundPlayerQuitCallback_ = this.onPlayerQuit_.bind(this);
};

// Max number of sprites allowed on screen.
SpriteDemoGame.MAX_NUM_SPRITES = 200;

// Default scale of sprites.
SpriteDemoGame.SCALE = 1;

SpriteDemoGame.getRandomInt = function(min, max)
{
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Runs the game. Game should load if not loaded yet.
// loadedCallback This function will be called when the game
// finishes loading or is already loaded and about to actually run.
SpriteDemoGame.prototype.run = function(loadedCallback)
{
  // If the game is already running, return immediately.
  if (this.isRunning_)
  {
    loadedCallback();
    return;
  }

  // Start loading if game not loaded yet.
  this.loadedCallback_ = loadedCallback;
  if (!this.isLoaded_)
  {
    this.loader_.load();
    return;
  }

  // Start running.
  this.start_();
};

// Stops the game.
SpriteDemoGame.prototype.stop = function()
{
  if (this.loadedCallback_ || !this.isRunning_)
  {
    this.loadedCallback_ = null;
    return;
  }

  this.isRunning_ = false;
  document.body.removeChild(this.renderer_.view);

  this.gameManager_.removeEventListener(cast.receiver.games.EventType.PLAYER_AVAILABLE, this.boundPlayerAvailableCallback_);
  this.gameManager_.removeEventListener(cast.receiver.games.EventType.GAME_MESSAGE_RECEIVED, this.boundGameMessageCallback_);
  this.gameManager_.removeEventListener(cast.receiver.games.EventType.PLAYER_QUIT, this.boundPlayerQuitCallback_);
  this.gameManager_.removeEventListener(cast.receiver.games.EventType.PLAYER_DROPPED, this.boundPlayerQuitCallback_);
};

// Adds the renderer and run the game. Calls loaded callback passed to #run.
SpriteDemoGame.prototype.start_ = function()
{
  // If callback is null, the game was stopped already.
  if (!this.loadedCallback_)
  {
    return;
  }

  document.body.appendChild(this.renderer_.view);
  this.isRunning_ = true;
  this.gameManager_.updateGameplayState(cast.receiver.games.GameplayState.RUNNING, null);
  requestAnimationFrame(this.boundUpdateFunction_);

  this.loadedCallback_();
  this.loadedCallback_ = null;

  this.gameManager_.addEventListener(cast.receiver.games.EventType.PLAYER_AVAILABLE, this.boundPlayerAvailableCallback_);
  this.gameManager_.addEventListener(cast.receiver.games.EventType.GAME_MESSAGE_RECEIVED, this.boundGameMessageCallback_);
  this.gameManager_.addEventListener(cast.receiver.games.EventType.PLAYER_QUIT, this.boundPlayerQuitCallback_);
  this.gameManager_.addEventListener(cast.receiver.games.EventType.PLAYER_DROPPED, this.boundPlayerQuitCallback_);
};

// Called when all assets are loaded.
SpriteDemoGame.prototype.onAssetsLoaded_ = function()
{
  this.background_ = PIXI.Sprite.fromImage('assets/background.jpg');
  this.background2_ = PIXI.Sprite.fromImage('assets/background.jpg');
  this.background_.position.x = this.background_.position.y = 0;
  this.background2_.position.x = this.background2_.position.y = 0;
  this.container_.addChild(this.background_);
  this.container_.addChild(this.background2_);

  for (var i = 0; i < SpriteDemoGame.MAX_NUM_SPRITES; i++)
  {
    var sprite = PIXI.Sprite.fromImage('assets/icon.png');
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    sprite.scale.x = sprite.scale.y = SpriteDemoGame.SCALE;
    this.sprites_[i] = sprite;

    this.spriteVelocities_[i] = { x: 0, y: 0 };
  }

  this.start_();
};

// Handles when a player becomes available to the game manager.
SpriteDemoGame.prototype.onPlayerAvailable_ = function(event)
{
  if (event.statusCode != cast.receiver.games.StatusCode.SUCCESS)
  {
    console.log('Error: Event status code: ' + event.statusCode);
    console.log('Reason for error: ' + event.errorDescription);
    return;
  }
  
  var playerId = event.playerInfo.playerId;
  
  // Automatically transition available players to playing state.
  this.gameManager_.updatePlayerState(playerId, cast.receiver.games.PlayerState.PLAYING, null);
};

// Handles when a player disconnects from the game manager.
SpriteDemoGame.prototype.onPlayerQuit_ = function(event)
{
  if (event.statusCode != cast.receiver.games.StatusCode.SUCCESS)
  {
    console.log('Error: Event status code: ' + event.statusCode);
    console.log('Reason for error: ' + event.errorDescription);
    return;
  }
  
  // Tear down the game if there are no more players. Might want to show a nice
  // UI with a countdown instead of tearing down instantly.
  var connectedPlayers = this.gameManager_.getConnectedPlayers();
  if (connectedPlayers.length == 0)
  {
    console.log('No more players connected. Tearing down game.');
    cast.receiver.CastReceiverManager.getInstance().stop();
  }
};

// Callback for game message sent via game manager.
SpriteDemoGame.prototype.onGameMessage_ = function(event)
{
  if (event.statusCode != cast.receiver.games.StatusCode.SUCCESS)
  {
    console.log('Error: Event status code: ' + event.statusCode);
    console.log('Reason for error: ' + event.errorDescription);
    return;
  }
  
  var message = event.requestExtraMessageData;

  if (message.type === 0)
  {
    if (this.numberSpritesAdded_ <
        SpriteDemoGame.MAX_NUM_SPRITES)
    {
      var sprite = this.sprites_[this.numberSpritesAdded_];
      sprite.position.x = SpriteDemoGame.getRandomInt(
          sprite.width / 2, this.canvasWidth_ - sprite.width / 2);
      sprite.position.y = SpriteDemoGame.getRandomInt(
          sprite.height / 2, this.canvasHeight_ - sprite.height / 2);
      this.numberSpritesAdded_ = this.numberSpritesAdded_ + 1;
      this.container_.addChild(sprite);
    }
    else
    {
      console.log('Maximum number of sprites added. Not adding a new one');
    }
  }
};

// Updates the game on each animation frame.
SpriteDemoGame.prototype.update_ = function(timestamp)
{
  if (!this.isRunning_)
  {
    return;
  }

  requestAnimationFrame(this.boundUpdateFunction_);

  for (var i = 0; i < this.numberSpritesAdded_; i++)
  {
    this.sprites_[i].rotation += 0.1;

    // Make it steer in random direction.
    this.spriteVelocities_[i].x +=
        SpriteDemoGame.getRandomInt(-2, 2);
    this.spriteVelocities_[i].y +=
        SpriteDemoGame.getRandomInt(-2, 2);

    if (Math.abs(this.spriteVelocities_[i].x) > 10)
    {
      this.spriteVelocities_[i].x *= 0.8;
    }

    if (Math.abs(this.spriteVelocities_[i].y) > 10)
    {
      this.spriteVelocities_[i].y *= 0.8;
    }

    // Move the sprite according to it's velocity.
    this.sprites_[i].position.x += this.spriteVelocities_[i].x;
    this.sprites_[i].position.y += this.spriteVelocities_[i].y;

    // Make sure the sprites don't fly off the screen.
    var spriteX = this.sprites_[i].position.x;
    var spriteY = this.sprites_[i].position.y;

    if (spriteX <= 0)
    {
      this.spriteVelocities_[i].x *= -1;
      this.sprites_[i].position.x = 0;
    }
    else if (spriteX >= this.canvasWidth_)
    {
      this.spriteVelocities_[i].x *= -1;
      this.sprites_[i].position.x = this.canvasWidth_;
    }

    if (spriteY <= 0)
    {
      this.spriteVelocities_[i].y *= -1;
      this.sprites_[i].position.y = 0;
    }
    else if (spriteY >= this.canvasHeight_)
    {
      this.spriteVelocities_[i].y *= -1;
      this.sprites_[i].position.y = this.canvasHeight_;
    }
  }

  this.backgroundPosition_++;

  this.background_.position.x = this.backgroundPosition_;
  this.background_.position.x %= this.background_.texture.width;

  this.background2_.position.x = this.background_.position.x;
  this.background2_.position.x -= this.background_.texture.width;

  this.renderer_.render(this.container_);
};

var game = null;

function OnMessage(event)
{
  document.write(event.message.type);
}

// Main entry point.
var initialize = function()
{
  var APP_ID = "DDCF8DA1";
  var NAMESPACE = "urn:x-cast:com.puzzud.projects.chromecastapp";
  
  cast.receiver.logger.setLevelValue(0);
  
  var castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
  
  console.log("Starting Receiver Manager");
  
  // handler for the 'ready' event
  castReceiverManager.onReady = function(event)
  {
    console.log("Received Ready event: " + JSON.stringify(event.data));
    castReceiverManager.setApplicationState("Application status is ready...");
  };
  
  // handler for 'senderconnected' event
  castReceiverManager.onSenderConnected = function(event)
  {
    console.log("Received Sender Connected event: " + event.data);
    console.log(castReceiverManager.getSender(event.data).userAgent);
  };
  
  // handler for 'senderdisconnected' event
  castReceiverManager.onSenderDisconnected = function(event)
  {
    console.log("Received Sender Disconnected event: " + event.data);
    if (castReceiverManager.getSenders().length == 0)
    {
      window.close();
    }
  };
  
  // handler for 'systemvolumechanged' event
  castReceiverManager.onSystemVolumeChanged = function(event)
  {
    console.log("Received System Volume Changed event: " + event.data["level"] + ' ' + event.data["muted"]);
  };
  
  // create a CastMessageBus to handle messages for a custom namespace
  window.messageBus = castReceiverManager.getCastMessageBus(NAMESPACE);
  
  // handler for the CastMessageBus message event
  window.messageBus.onMessage = function(event)
  {
    console.log("Message [" + event.senderId + "]: " + event.data);
    // display the message from the sender
    displayText(event.data);
    // inform all senders on the CastMessageBus of the incoming message event
    // sender message listener will be invoked
    window.messageBus.send(event.senderId, event.data);
  }

  // Create the game before starting castReceiverManager to make sure any extra
  // cast namespaces can be set up.
  var gameConfig = new cast.receiver.games.GameManagerConfig();
  gameConfig.applicationName = "Sprite Demo";
  gameConfig.maxPlayers = 10;

  var gameManager = new cast.receiver.games.GameManager(gameConfig);

  game = new SpriteDemoGame(gameManager);

  var startGame = function()
  {
    game.run
    (
      function()
      {
        console.log("Game running.");
        gameManager.updateGameStatusText("Game running.");
      }
    );
  };

  castReceiverManager.onReady = function(event)
  {
    if (document.readyState === "complete")
    {
      startGame();
    }
    else 
    {
      window.onload = startGame;
    }
  };
  
  // initialize the CastReceiverManager with an application status message
  var appConfig = new cast.receiver.CastReceiverManager.Config();
  appConfig.statusText = "Sprite Demo";
  appConfig.maxInactivity = 6000; // In production, use the default maxInactivity instead of using this.
  castReceiverManager.start(appConfig);
  
  console.log("Receiver Manager started");
};

if (document.readyState === "complete")
{
  initialize();
}
else
{
  /** Main entry point. */
  window.onload = initialize;
}
