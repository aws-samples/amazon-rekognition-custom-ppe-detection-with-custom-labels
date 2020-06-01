// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';

export default class CognitoConnector {
  constructor() {
    this.$user = undefined;
    this.$sessionTimer = undefined;
    this.$userPool = new AmazonCognitoIdentity.CognitoUserPool({
      UserPoolId: CognitoConnector.Constants.UserPoolId,
      ClientId: CognitoConnector.Constants.ClientId,
    });
    AWS.config.region = CognitoConnector.Constants.Region;
  }

  static get Constants() {
    return {
      Region: SolutionManifest.Region,
      UserPoolId: SolutionManifest.Cognito.UserPoolId,
      ClientId: SolutionManifest.Cognito.ClientId,
      IdentityPoolId: SolutionManifest.Cognito.IdentityPoolId,
      RedirectUri: encodeURIComponent(SolutionManifest.Cognito.RedirectUri),
    };
  }

  static getSingleton() {
    if (!window.AWSomeNamespace) {
      window.AWSomeNamespace = {};
    }
    if (!window.AWSomeNamespace.CognitoConnectorSingleton) {
      window.AWSomeNamespace.CognitoConnectorSingleton = new CognitoConnector();
    }
    return window.AWSomeNamespace.CognitoConnectorSingleton;
  }

  get user() {
    return this.$user;
  }

  set user(val) {
    this.$user = val;
  }

  get userPool() {
    return this.$userPool;
  }

  set userPool(val) {
    this.$userPool = val;
  }

  get isAnonymousUser() {
    return !(this.userPool.getCurrentUser());
  }

  get sessionTimer() {
    return this.$sessionTimer;
  }

  set sessionTimer(val) {
    this.$sessionTimer = val;
  }

  getCognitoIdpEndpoint() {
    return [
      `cognito-idp.${CognitoConnector.Constants.Region}.amazonaws.com`,
      CognitoConnector.Constants.UserPoolId,
    ].join('/');
  }

  /**
   * @function getUserSession
   * @description wrapper to Cognito getSession to get current user session
   * @param {CognitoUser} user
   */
  async getUserSession(user) {
    return new Promise((resolve, reject) => {
      const currentUser = user || this.user;
      return (!currentUser)
        ? reject(new Error('no current user'))
        : currentUser.getSession((e, session) =>
          ((e) ? reject(new Error(e)) : resolve(session)));
    });
  }

  /**
   * @function checkStatus
   * @description check if there is current, valid coginto user
   */
  async checkStatus() {
    this.user = this.userPool.getCurrentUser();
    if (!this.user) {
      throw new Error('no current user');
    }

    const session = await this.getUserSession(this.user);
    if (!session.isValid()) {
      const username = this.user.username;
      this.user.signOut();
      this.user = undefined;
      throw Error(`session expired for ${username}`);
    }
    return this.user;
  }

  /**
   * @function onSuccess
   * @description callback from authentication
   * @param {function} resolve
   * @param {function} reject
   * @param {object} data
   */
  async onSuccess(resolve, reject, data) {
    console.log(`${this.user.username} logged in`);
    return resolve({
      status: 'completed',
    });
  }

  /**
   * @function onFailure
   * @description callback from authentication
   * @param {function} resolve
   * @param {function} reject
   * @param {Error} e
   */
  async onFailure(resolve, reject, e) {
    this.user = undefined;
    return reject(new Error(e.message));
  }

  /**
   * @function newPasswordRequired
   * @description callback from authentication
   * @param {function} resolve
   * @param {function} reject
   * @param {object} userAttributes
   * @param {object} requiredAttributes
   */
  async newPasswordRequired(resolve, reject, userAttributes, requiredAttributes) {
    resolve({
      status: 'newPasswordRequired',
      userAttributes,
      requiredAttributes,
    });
  }

  /**
   * @function confirmNewPassword
   * @description handle FORCE_CHANGE_PASSWORD message where user is required
   * to set new password
   * @param {string} Password
   */
  async confirmNewPassword(Password) {
    return new Promise((resolve, reject) =>
      this.user.completeNewPasswordChallenge(Password, {}, {
        onSuccess: this.onSuccess.bind(this, resolve, reject),
        onFailure: this.onFailure.bind(this, resolve, reject),
      }));
  }

  /**
   * @function authenticate
   * @description authenticate user with Cognito service
   * @param {object} params
   */
  async authenticate(params) {
    return new Promise((resolve, reject) => {
      const missing = [
        'Username',
        'Password',
      ].filter(x => !x);

      if (missing.length) {
        reject(new Error('invalid username or password'));
      }

      const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
        Username: params.Username,
        Password: params.Password,
      });

      this.user = new AmazonCognitoIdentity.CognitoUser({
        Username: params.Username,
        Pool: this.userPool,
      });

      this.user.authenticateUser(authenticationDetails, {
        onSuccess: this.onSuccess.bind(this, resolve, reject),
        onFailure: this.onFailure.bind(this, resolve, reject),
        newPasswordRequired: this.newPasswordRequired.bind(this, resolve, reject),
      });
    });
  }

  /**
   * @function getCredentials
   * @description get AWS credentials from Cognito IDP
   */
  async getCredentials() {
    const idToken = this.user.getSignInUserSession().getIdToken();
    const endpoint = this.getCognitoIdpEndpoint();

    const params = {
      IdentityPoolId: CognitoConnector.Constants.IdentityPoolId,
      Logins: {
        [endpoint]: idToken.getJwtToken(),
      },
    };

    const credentials = new AWS.CognitoIdentityCredentials(params, {
      region: CognitoConnector.Constants.Region,
    });

    return credentials.getPromise().then(() => {
      AWS.config.credentials = credentials;
      AWS.config.region = CognitoConnector.Constants.Region;
      this.monitorSession(idToken.getExpiration());
      return credentials;
    });
  }

  /**
   * @function toStringFromMsecs
   * @description helper function to format millsecs into HH:MM:SS.mmm
   * @param {number} msec
   * @return {string}
   */
  static toStringFromMsecs(msec) {
    const HH = Math.floor(msec / 3600000).toString().padStart(2, '0');
    const MM = Math.floor((msec % 3600000) / 60000).toString().padStart(2, '0');
    const SS = Math.floor((msec % 60000) / 1000).toString().padStart(2, '0');
    const mmm = Math.ceil(msec % 1000).toString().padStart(3, '0');
    return `${HH}:${MM}:${SS}.${mmm}`;
  }

  /**
   * @function signOut
   * @description onSignOut, reset credential.
   */
  signOut() {
    this.user.signOut();
    AWS.config.credentials = undefined;
  }

  async signIn() {
    await this.checkStatus();
    await this.getCredentials();
    return this.user;
  }

  /**
   * @function refreshSession
   * @description refresh the session periodically
   */
  async refreshSession() {
    const currentSession = await this.getUserSession();
    await new Promise((resolve, reject) =>
      this.user.refreshSession(currentSession.refreshToken, (e, refresh) =>
        ((e) ? reject(new Error(e)) : resolve(refresh))));
    return this.getCredentials();
  }

  /**
   * @function monitorSession
   * @description refresh session before the session is expired.
   * @param {number} expiration - in seconds
   */
  monitorSession(expiration) {
    const dateExp = new Date(expiration * 1000);
    const refresh = dateExp - new Date() - (10 * 1000);

    console.log(`schedule to refresh session in ${CognitoConnector.toStringFromMsecs(refresh)} (${dateExp.toISOString()})`);

    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    this.sessionTimer = setTimeout(async () =>
      this.refreshSession().catch((e) =>
        console.error(encodeURIComponent(e.message))), refresh);
  }

  /**
   * @function forgotPasswordFlow
   * @description run forgot password flow
   * @param {object} params
   */
  async forgotPasswordFlow(params = {}) {
    return new Promise((resolve, reject) => {
      if (!params.Username) {
        reject(new Error('invalid username'));
      }

      this.user = new AmazonCognitoIdentity.CognitoUser({
        Username: params.Username,
        Pool: this.userPool,
      });

      /* start the forgot password flow */
      this.user.forgotPassword({
        onSuccess: this.onSuccess.bind(this, resolve, reject),
        onFailure: this.onFailure.bind(this, resolve, reject),
        inputVerificationCode: this.inputVerificationCode.bind(this, resolve, reject),
      });
    });
  }

  /**
   * @function inputVerificationCode
   * @description callback from authentication
   * @param {function} resolve
   * @param {function} reject
   * @param {object} data
   */
  async inputVerificationCode(resolve, reject, data) {
    resolve({
      status: 'inputVerificationCode',
      data,
    });
  }

  /**
   * @function confirmPassword
   * @description complete forgot password flow to confirm both verificationCode and Password
   * @param {string} VerificationCode
   * @param {string} Password
   */
  async confirmPassword(VerificationCode, Password) {
    return new Promise((resolve, reject) =>
      this.user.confirmPassword(VerificationCode, Password, {
        onSuccess: this.onSuccess.bind(this, resolve, reject),
        onFailure: this.onFailure.bind(this, resolve, reject),
      }));
  }
}
