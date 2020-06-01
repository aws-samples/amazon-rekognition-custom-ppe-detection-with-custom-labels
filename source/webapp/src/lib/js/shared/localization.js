// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
export default class Localization {
  static get isoCode() {
    return 'en-US';
  }

  static get Messages() {
    return Localization.Languages[Localization.isoCode].Messages;
  }

  static get Tooltips() {
    return Localization.Languages[Localization.isoCode].Tooltips;
  }

  static get Buttons() {
    return Localization.Languages[Localization.isoCode].Buttons;
  }

  static get Alerts() {
    return Localization.Languages[Localization.isoCode].Alerts;
  }

  static get Statuses() {
    return Localization.Languages[Localization.isoCode].Statuses;
  }

  static get Languages() {
    return {
      'en-US': {
        Messages: {
          /* signin flow */
          Title: 'Custom PPE Detection Demo <span style="font-size:0.85rem">by AWS Specialist SA, AI/ML Team</span>',
          PasswordRequirement: 'Password must be at least <abbr title="eight characters">eight</abbr> characters long and contain <abbr title="one uppercase character">one</abbr> uppercase, <abbr title="one lowercase character">one</abbr> lowercase, <abbr title="one numeric character">one</abbr> number, and <abbr title="one special character">one</abbr> special character.',
          ResetSendCode: 'Please enter the username and press <strong>Send code</strong>. You should receive a 6-digits code in mail in a few minutes. You will need the code to reset the password.',
          ResetPassword: 'Please enter the verification code that has sent to your email address and your new password.',
          /* about tab panel */
          AboutTab: 'About',
          Mission: 'Cust PPE Detection Demo demonstrates the use of a combination of <a href="https://docs.aws.amazon.com/rekognition/latest/dg/labels.html" target="_blank">Amazon Rekognition Label detection</a> and <a href="https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/gs-introduction.html" target="_blank">Amazon Rekognition Custom Labels</a> to identify indiviaul who wears vest or not.',
          Design: 'Architecture Design goes here...',
          Team: 'Team member goes here...',
          /* collection tab panel */
          AnalysisTab: 'Analysis',
          TrainingTab: 'Training',
          ProjectTab: 'Project',
          DropzoneDesc: '<p>Choose a model from <abbr title="title">Available models</abbr> selection and \'drag and drop\' images to the \'drop area\' to start analysis. You can drop multiple images or folders. (Note: Folder is supported in Chrome, Firefox, and Edge browsers.)</p><p>If this is your first time accessing this demo portal, most likely you don\'t have any model. Switch to <strong>Training Tab</strong> to train a new model.</p>',
          PrepareDatasetDesc: 'To prepare your training dataset, \'drag and drop\' the training images into the \'drop area\'. The images can contain multiple people since this demo automatically crops all peope using <a href="" target="_blank">Amazon Rekognition Label Detection</a>.</p><p>Recommended to have at least 100 people to get a reasonable prediction.</p>',
          LabelDatasetDesc: 'Label your dataset by \'drag and drop\' people who wear vest to the <strong>Vest zone</strong> and people who don\'t wear vest to the <strong>No vest zone</strong>. Once you are done, click on <strong/>Create dataset</strong> to create and upload the training dataset.',
          Dataset: 'Dataset',
          VestLabel: '<strong>Vest</strong> zone',
          NoVestLabel: '<strong>No vest</strong> zone',
          Unlabeled: 'Drag images to <strong>Vest</strong> or <strong>No vest</strong> zones',
          DropFilesHere: 'Drop file(s) here',
          DropTrainingImagesHere: 'Drop training image(s) here',
          Download: 'Download',
          ViewJson: 'View JSON',
          ViewMetric: 'Metrics',
          SelectTrainingOptionsDesc: 'Select different options to prepare your training dataset. If you are not sure what to do, choose <abbr title="option 1">Option 1</abbr>.',
          OptionWithLabelDetection: '<strong>Option 1:</strong> Choose this option if you have images that contains multiple people or the person has not been properly cropped. This option leverages <a href="https://docs.aws.amazon.com/rekognition/latest/dg/labels.html" target="_blank">Amazon Rekognition Label Detection</a> to detect all people within an image and automatically crops and prepares the dataset for you. See sample images below. (Images courtesy of <a href="https://www.pexels.com" target="_blank">pexels.com</a> and <a href="https://www.unsplash.com" target="_blank">unsplash.com</a>.)',
          OptionWithoutLabelDetection: '<strong>Option 2:</strong> Choose this option if you confirm that your images are properly cropped as follows. (Images courtesy of <a href="https://www.pexels.com" target="_blank">pexels.com</a> and <a href="https://www.unsplash.com" target="_blank">unsplash.com</a>.)',
          OptionManual: '<strong>Option 3:</strong> Manually create your own training dataset through <a href="{{PROJECT_URL}}" target="_blank">Amazon Rekognition Custom Labels</a> console. When you are done, switch to <strong>Project Tab</strong> to check the moel training status.',
          AvailableModels: 'Available models',
          ModelTrainingDesc: 'Ready to train your first Custom Labels with two labels: <strong>vest</strong> and <strong>novest</strong>. Confirm the information below and click on <strong>Train model</strong>. Depending on the size of your dataset, the training time varies from 45 minutes to a few hours.',
          ProjectName: 'Project name',
          SelectedDataset: 'Selected dataset',
          ViewModelStatusDesc: 'View your Amazon Rekognition Custom Labels project status, start and stop a specific project version (model). Please also note that you could have <strong>2</strong> concurrent running Amazon Rekognition Custom Labels models per account, learn more about <a href="https://docs.aws.amazon.com/general/latest/gr/rekognition_region.html" target="_blank">service quota</a>.',
          ModelList: 'List of project versions (models)',
          ModelCreated: 'Model <strong>{{MODELVERSION}}</strong> is successfully created and in training mode. Switch to <strong>Project Tab</strong> to check the training status.',
          ModelRemoved: 'Model <strong>{{MODELVERSION}}</strong> has been removed.',
          /* project tab */
          ModelArn: 'Model Arn',
          ModelStatus: 'Status',
          ModelStatusMessage: 'Status Message',
          ModelCreationDate: 'Creation Date',
          ModelTrainCompletedDate: 'Train Completed Date',
          ModelTrainingElapsed: 'Training Elapsed Time',
          ModelF1Score: 'F1 Score',
          ModelRunningInferences: 'Running Inferences',
          ModelTrainingDataset: 'Training Dataset',
          ModelTestingDataset: 'Testing Dataset',
          ModelTestingDataAutoCreated: 'Auto split from training dataset',
          ModelEvaluation: 'Model Evaluation',
          Input: 'Input',
          Output: 'Output',
        },
        Tooltips: {
          /* main view */
          VisitSolutionPage: 'Learn more about Amazon Rekognition Custom Labels',
          Logout: 'ready to logout?',
          ViewOnAWSConsole: 'view on console',
          DownloadFile: 'download file',
        },
        Buttons: {
          Back: 'Back',
          Next: 'Next',
          Cancel: 'Cancel',
          Startover: 'Start over',
          ClosePreview: 'Close preview window',
          SelectOption: 'Select this option',
          CreateDataset: 'Create dataset',
          Vest: 'Vest',
          NoVest: 'No vest',
          StartTraining: 'Start training',
          StartModel: 'Start model',
          StopModel: 'Stop model',
        },
        Statuses: {
        },
        Alerts: {
          Oops: 'Oops...',
          Warning: 'Warning',
          Confirmed: 'Confirmed',
          Info: 'Info',
          Success: 'Success',
          /* sign in */
          PasswordConformance: 'Passwords don\'t conform with the requirements. Please make sure the password is at least 8 characters, 1 uppercase, 1 lowercase, 1 numeric, and 1 special character.',
          UsernameConformance: 'Username don\'t conform with the requirements. Please make sure the username only contains alphanumeric and/or \'.\', \'_\', \'%\', \'+\', \'-\' characters',
          SignInProblem: 'Problem to sign in. Please try again.',
          MismatchPasswords: 'Passwords don\'t match. Please re-enter the password',
          PasswordConfirmed: 'Your new password has been set. Please re-sign in to the portal.',
          SessionExpired: 'Session expired. Please sign in again.',
          /* label dataset */
          NotEnoughTrainingData: 'Not enough training data! Minimum to have at \'10\' per each label (vest and no vest). Recommended to have at least \'100\' per each label for better prediction.',
          ModelNotRunning: 'Model is not running. Switch to <strong>Project Tab</strong> and make sure the selected model is running.',
        },
      },
    };
  }
}
