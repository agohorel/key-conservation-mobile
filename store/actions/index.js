import axios from 'axios';

import * as SecureStore from 'expo-secure-store';

import { navigate } from '../../navigation/RootNavigator';
import { Alert } from 'react-native';
import JwtDecode from 'jwt-decode';

// // This is defined here to prevent
// // any un

// // IMPORTANT USAGE NOTES
// // Usage:
// /*
//   axiosWithAuth(dispatch, axiosInstance => {
//     return axiosInstance...
//   })
// */
// // axiosWithAuth will take a callback function
// // that gets an axios instance.
// // By using that axios instance to perform a
// // request that required authentication, the
// // user's token will be included in the header
const axiosWithAuth = (dispatch, req) => {
  return SecureStore.getItemAsync('accessToken')
    .then(token => {
      // Create request with auth header
      const instance = axios.create({
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      // Response interceptor to check whether or not
      // to log the user out
      instance.interceptors.response.use(
        response => response,
        error => {
          if (error.response?.data?.logout) {
            dispatch(logout(error.response.data.message));
          }
          return Promise.reject(error);
        }
      );

      return req(instance);
    })
    .catch(err => {
      console.log(err);
    });
};

// url for heroku staging vs production server
// comment out either server depending on testing needs
// production
const seturl = 'https://key-conservation.herokuapp.com/api/';
// staging
// const seturl = 'https://key-conservation-staging.herokuapp.com/api/';


const filterUrls = (keys, object) => {
  // If a user doesn't include http or https in their URL this function will add it.
  // If they already include it it will be ignored. and if it is capital "Https || Http" it will become lowercase.
  keys.forEach(key => {
    if (
      object[key] &&
      object[key] !== null &&
      object[key].indexOf('http://') !== 0 &&
      object[key].indexOf('https://') !== 0
    ) {
      object[key] = object[key].toLowerCase();
      object[key] = 'https://' + object[key];
    }
  });
  return object;
};

export const [LOGIN_START, LOGIN_ERROR, LOGIN_SUCCESS] = [
  'LOGIN_START',
  'LOGIN_ERROR',
  'LOGIN_SUCCESS'
];

export const loginStart = () => ({
  type: LOGIN_START
});
export const loginError = error => ({
  type: LOGIN_ERROR,
  payload: error
});
export const loginSuccess = (credentials, role) => async dispatch => {
  await SecureStore.setItemAsync('accessToken', credentials.idToken);

  const decoded = JwtDecode(credentials.idToken);

  await SecureStore.setItemAsync('sub', decoded.sub);
  await SecureStore.setItemAsync('email', decoded.email);
  await SecureStore.setItemAsync('roles', role);

  dispatch(getProfileData(null, decoded.sub, true))
    .then(() => {
      navigate('Loading');
      dispatch({
        type: LOGIN_SUCCESS
      });
    })
    .catch(() => {
      dispatch({
        type: LOGIN_ERROR
      });
    });
};

export const LOGOUT = 'LOGOUT';

export const logout = (message = '') => async dispatch => {
  await SecureStore.deleteItemAsync('sub', {});
  await SecureStore.deleteItemAsync('email', {});
  await SecureStore.deleteItemAsync('roles', {});
  await SecureStore.deleteItemAsync('id', {});
  await SecureStore.deleteItemAsync('userId', {});
  await SecureStore.deleteItemAsync('accessToken', {});

  console.log('logging out');

  navigate('Logout');

  if (message) Alert.alert(message);

  dispatch({
    type: LOGOUT,
    payload: message
  });
};

export const AFTER_FIRST_LOGIN = 'AFTER_FIRST_LOGIN';

export const afterFirstLogin = () => ({
  type: AFTER_FIRST_LOGIN
});

export const getAirtableKey = () => {
  axiosWithAuth(null, aaxios => {
    aaxios
      .get(`${seturl}airtable`)
      .then(async response => {
        await SecureStore.setItemAsync(
          'airtableKey',
          response.data.airtable_key
        );
        return response.data.airtable_key;
      })
      .catch(error => console.log(error));
  });
};

// This is used in the admin screen, report detail section
// Data comes in as a table name and an ID
// So this function allows for the dynamic request of any
// type of report
export const getCustomById = (table_name, id) => dispatch => {
  let url = `${seturl}`;

  switch (table_name) {
    case 'campaign_updates': {
      url += 'updates';
      break;
    }
    case 'comments': {
      url += 'comments/com';
      break;
    }
    case 'campaigns': {
      url += 'campaigns';
      break;
    }
    default: {
      console.warn(
        `Invalid table name ${table_name}: getCustomById(table_name, id) in actions`
      );
      return;
    }
  }

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios.get(`${url}/${id}`);
  });
};

// These actions are for the loading page to determine if:
// A) The user is logged in
// B) The account exists and user is not logged in
// C) The user has a sub and needs to register
// D) The user needs to make a sub and to register
export const [
  GET_AUTH_START,
  GET_AUTH_USER,
  GET_AUTH_REGISTER,
  GET_AUTH_ERROR
] = ['GET_AUTH_START', 'GET_AUTH_USER', 'GET_AUTH_REGISTER', 'GET_AUTH_ERROR'];

export const getLoadingData = sub => dispatch => {
  let url = `${seturl}users/subcheck/${sub}`;

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .get(url)
      .then(response => {
        let dbCheck = response.data.check.subCheck;
        if (dbCheck === true) {
          dispatch({ type: GET_AUTH_USER, payload: dbCheck });
        } else {
          dispatch({ type: GET_AUTH_REGISTER, payload: dbCheck });
        }
      })
      .catch(error => {
        console.log(error);
        dispatch({ type: GET_AUTH_ERROR, payload: error.message });
      });
  });
};

export const [GET_PROFILE_START, GET_PROFILE_ERROR, GET_PROFILE_SUCCESS] = [
  'GET_PROFILE_START',
  'GET_PROFILE_ERROR',
  'GET_PROFILE_SUCCESS'
];

export const getProfileData = (
  id,
  sub,
  myProfile = false,
  noDispatch = false
) => dispatch => {
  {
    !noDispatch && dispatch({ type: GET_PROFILE_START });
  }

  let user, url;
  if (id) url = `${seturl}users/${id}`;
  else if (sub) url = `${seturl}users/sub/${sub}`;

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .get(url)
      .then(res => {
        user = res.data.user;
        {
          !noDispatch &&
            dispatch({
              type: GET_PROFILE_SUCCESS,
              payload: { user, myProfile }
            });
        }
        return user;
      })
      .catch(err => {
        if (noDispatch) {
          return err.message;
        } else {
          dispatch =>
            Promise.all([
              SecureStore.deleteItemAsync('sub', {}),
              SecureStore.deleteItemAsync('email', {}),
              SecureStore.deleteItemAsync('roles', {}),
              SecureStore.deleteItemAsync('id', {}),
              SecureStore.deleteItemAsync('accessToken', {})
            ]).then(
              dispatch({ type: GET_PROFILE_ERROR, payload: err.message })
            );
        }
      });
  });
};

export const [EDIT_PROFILE_START, EDIT_PROFILE_ERROR, EDIT_PROFILE_SUCCESS] = [
  'EDIT_PROFILE_START',
  'EDIT_PROFILE_ERROR',
  'EDIT_PROFILE_SUCCESS'
];

export const editProfileData = (id, changes) => dispatch => {
  dispatch({ type: EDIT_PROFILE_START });

  const filteredChanges = filterUrls(
    ['facebook', 'twitter', 'instagram', 'org_link_url', 'org_cta'],
    changes
  );

  let formData = new FormData();

  let keys = Object.keys(filteredChanges).filter(key => {
    return key !== 'profile_image';
  });

  if (filteredChanges.profile_image) {
    const uri = filteredChanges.profile_image;

    let uriParts = uri.split('.');
    let fileType = uriParts[uriParts.length - 1];

    formData.append('photo', {
      uri,
      name: `photo.${fileType}`,
      type: `image/${fileType}`
    });
  }

  keys.forEach(key => {
    if (filteredChanges[key] !== null) {
      formData.append(key, filteredChanges[key]);
    }
  });

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .put(`${seturl}users/${id}`, formData, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data'
        }
      })
      .then(res => {
        dispatch({ type: EDIT_PROFILE_SUCCESS, payload: res.data.editUser });
      })
      .catch(err => {
        console.log(err);
        dispatch({ type: EDIT_PROFILE_ERROR, payload: err });
      });
  });
};

export const [POST_USER_START, POST_USER_ERROR, POST_USER_SUCCESS] = [
  'POST_USER_START',
  'POST_USER_ERROR',
  'POST_USER_SUCCESS'
];

export const postUser = user => dispatch => {
  dispatch({ type: POST_USER_START });

  const filteredPost = filterUrls(
    ['facebook', 'twitter', 'instagram', 'org_link_url', 'org_cta'],
    user
  );

  let formData = {};

  let keys = Object.keys(filteredPost).filter(key => {
    return key !== 'profile_image';
  });

  if (filteredPost.profile_image) {
    const uri = filteredPost.profile_image;
    const uriParts = uri.split('.');
    let fileType = uriParts[uriParts.length - 1];
    formData.photo = {
      uri,
      name: `photo.${fileType}`,
      type: `image/${fileType}`
    };
  }

  keys.forEach(key => {
    if (filteredPost[key] !== null) {
      formData = {
        ...formData,
        [key]: filteredPost[key]
      };
      console.log('formData from foreach', formData);
      return formData;
    }
  });

  console.log('formData', formData);

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .post(`${seturl}users`, formData)
      .then(res => {
        dispatch({ type: POST_USER_SUCCESS, payload: res.data.newUser });
      })
      .catch(err => {
        console.log(err.response, 'err in postUser');
        dispatch({ type: POST_USER_ERROR, payload: err });
      });
  });
};

export const [
  GET_CAMPAIGNS_START,
  GET_CAMPAIGNS_ERROR,
  GET_CAMPAIGNS_SUCCESS
] = ['GET_CAMPAIGNS_START', 'GET_CAMPAIGNS_ERROR', 'GET_CAMPAIGNS_SUCCESS'];

export const getCampaigns = () => dispatch => {
  dispatch({ type: GET_CAMPAIGNS_START });
  let campaigns;
  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .get(`${seturl}campaigns`)
      .then(res => {
        campaigns = res.data.camp;
        return aaxios
          .get(`${seturl}updates`)
          .then(res => {
            campaigns = campaigns.concat(res.data.campUpdate);
            dispatch({
              type: GET_CAMPAIGNS_SUCCESS,
              payload: campaigns
            });
          })
          .catch(err => {
            console.log(err);
            dispatch({ type: GET_CAMPAIGNS_ERROR, payload: err });
          });
      })
      .catch(err => {
        console.log(err.response);
        dispatch({ type: GET_CAMPAIGNS_ERROR, payload: err });
      });
  });
};

export const [GET_CAMPAIGN_START, GET_CAMPAIGN_ERROR, GET_CAMPAIGN_SUCCESS] = [
  'GET_CAMPAIGN_START',
  'GET_CAMPAIGN_ERROR',
  'GET_CAMPAIGN_SUCCESS'
];

export const getCampaign = id => dispatch => {
  dispatch({ type: GET_CAMPAIGN_START });

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .get(`${seturl}campaigns/${id}`)
      .then(res => {
        dispatch({ type: GET_CAMPAIGN_SUCCESS, payload: res.data.camp });
      })
      .catch(err => {
        dispatch({ type: GET_CAMPAIGN_ERROR, payload: err });
      });
  });
};

export const SET_CAMPAIGN = 'SET_CAMPAIGN';

export const setCampaign = camp => {
  return {
    type: SET_CAMPAIGN,
    payload: camp
  };
};

export const [
  POST_CAMPAIGN_START,
  POST_CAMPAIGN_ERROR,
  POST_CAMPAIGN_SUCCESS
] = ['POST_CAMPAIGN_START', 'POST_CAMPAIGN_ERROR', 'POST_CAMPAIGN_SUCCESS'];

export const postCampaign = camp => dispatch => {
  dispatch({ type: POST_CAMPAIGN_START });

  const filteredCamp = filterUrls(['camp_cta'], camp);

  const uri = filteredCamp.camp_img;

  let uriParts = uri.split('.');
  let fileType = uriParts[uriParts.length - 1];

  let formData = new FormData();
  formData.append('photo', {
    uri,
    name: `photo.${fileType}`,
    type: `image/${fileType}`
  });
  formData.append('camp_cta', filteredCamp.camp_cta);
  formData.append('camp_desc', filteredCamp.camp_desc);
  formData.append('camp_name', filteredCamp.camp_name);
  formData.append('users_id', filteredCamp.users_id);
  formData.append('urgency', filteredCamp.urgency);

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .post(`${seturl}campaigns`, formData, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data'
        }
      })
      .then(res => {
        dispatch({ type: POST_CAMPAIGN_SUCCESS, payload: res.data.newCamps });
      })
      .catch(err => {
        dispatch({ type: POST_CAMPAIGN_ERROR, payload: err });
      });
  });
};

export const [
  DELETE_CAMPAIGN_START,
  DELETE_CAMPAIGN_ERROR,
  DELETE_CAMPAIGN_SUCCESS
] = [
  'DELETE_CAMPAIGN_START',
  'DELETE_CAMPAIGN_ERROR',
  'DELETE_CAMPAIGN_SUCCESS'
];

export const deleteCampaign = id => dispatch => {
  dispatch({ type: DELETE_CAMPAIGN_START, payload: id });

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .delete(`${seturl}campaigns/${id}`)
      .then(res => {
        dispatch({ type: DELETE_CAMPAIGN_SUCCESS, payload: res.data });
      })
      .catch(err => {
        dispatch({ type: DELETE_CAMPAIGN_ERROR, payload: err });
        return { error: err, id };
      });
  });
};

export const [
  EDIT_CAMPAIGN_START,
  EDIT_CAMPAIGN_ERROR,
  EDIT_CAMPAIGN_SUCCESS
] = ['EDIT_CAMPAIGN_START', 'EDIT_CAMPAIGN_ERROR', 'EDIT_CAMPAIGN_SUCCESS'];

export const editCampaign = (id, changes) => dispatch => {
  dispatch({ type: EDIT_CAMPAIGN_START });

  let formData = new FormData();

  let keys = Object.keys(changes).filter(key => {
    return key !== 'camp_img';
  });

  if (changes.camp_img) {
    const uri = changes.camp_img;

    let uriParts = uri.split('.');
    let fileType = uriParts[uriParts.length - 1];

    formData.append('photo', {
      uri,
      name: `photo.${fileType}`,
      type: `image/${fileType}`
    });
  }

  keys.forEach(key => {
    formData.append(key, changes[key]);
  });

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .put(`${seturl}campaigns/${id}`, formData, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data'
        }
      })
      .then(res => {
        dispatch({ type: EDIT_CAMPAIGN_SUCCESS, payload: res.data.editCamp });
      })
      .catch(err => {
        dispatch({ type: EDIT_CAMPAIGN_ERROR, payload: err });
      });
  });
};

export const [
  POST_CAMPAIGN_UPDATE_START,
  POST_CAMPAIGN_UPDATE_ERROR,
  POST_CAMPAIGN_UPDATE_SUCCESS
] = [
  'POST_CAMPAIGN_UPDATE_START',
  'POST_CAMPAIGN_UPDATE_ERROR',
  'POST_CAMPAIGN_UPDATE_SUCCESS'
];

export const postCampaignUpdate = campUpdate => dispatch => {
  dispatch({ type: POST_CAMPAIGN_UPDATE_START });

  const uri = campUpdate.update_img;

  let uriParts = uri.split('.');
  let fileType = uriParts[uriParts.length - 1];

  let formData = new FormData();
  formData.append('photo', {
    uri,
    name: `photo.${fileType}`,
    type: `image/${fileType}`
  });

  formData.append('update_desc', campUpdate.update_desc);
  formData.append('users_id', campUpdate.users_id);
  formData.append('camp_id', campUpdate.camp_id);

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .post(`${seturl}updates`, formData, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data'
        }
      })
      .then(res => {
        dispatch({
          type: POST_CAMPAIGN_UPDATE_SUCCESS,
          payload: res.data.newCampUpdates
        });
      })
      .catch(err => {
        dispatch({ type: POST_CAMPAIGN_UPDATE_ERROR, payload: err });
        return err;
      });
  });
};

export const [
  EDIT_CAMPAIGN_UPDATE_START,
  EDIT_CAMPAIGN_UPDATE_ERROR,
  EDIT_CAMPAIGN_UPDATE_SUCCESS
] = [
  'EDIT_CAMPAIGN_UPDATE_START',
  'EDIT_CAMPAIGN_UPDATE_ERROR',
  'EDIT_CAMPAIGN_UPDATE_SUCCESS'
];

export const editCampaignUpdate = (id, changes) => dispatch => {
  dispatch({ type: EDIT_CAMPAIGN_UPDATE_START });

  let formData = new FormData();

  let keys = Object.keys(changes).filter(key => {
    return key !== 'update_img';
  });

  if (changes.update_img) {
    const uri = changes.update_img;

    let uriParts = uri.split('.');
    let fileType = uriParts[uriParts.length - 1];

    formData.append('photo', {
      uri,
      name: `photo.${fileType}`,
      type: `image/${fileType}`
    });
  }

  keys.forEach(key => {
    formData.append(key, changes[key]);
  });

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .put(`${seturl}updates/${id}`, formData, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data'
        }
      })
      .then(res => {
        dispatch({
          type: EDIT_CAMPAIGN_UPDATE_SUCCESS,
          payload: res.data.editCampUpdate
        });
      })
      .catch(err => {
        dispatch({ type: EDIT_CAMPAIGN_UPDATE_ERROR, payload: err });
      });
  });
};

export const [
  DELETE_CAMPAIGN_UPDATE_START,
  DELETE_CAMPAIGN_UPDATE_ERROR,
  DELETE_CAMPAIGN_UPDATE_SUCCESS
] = [
  'DELETE_CAMPAIGN_UPDATE_START',
  'DELETE_CAMPAIGN_UPDATE_ERROR',
  'DELETE_CAMPAIGN_UPDATE_SUCCESS'
];

export const deleteCampaignUpdate = id => dispatch => {
  console.log('deleting campaign update');
  dispatch({ type: DELETE_CAMPAIGN_UPDATE_START, payload: id });
  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .delete(`${seturl}updates/${id}`)
      .then(res => {
        console.log('success in actions', res.data);
        dispatch({ type: DELETE_CAMPAIGN_UPDATE_SUCCESS, payload: res.data });
      })
      .catch(err => {
        console.log(err);
        dispatch({ type: DELETE_CAMPAIGN_UPDATE_ERROR, payload: err });
        return { error: err, id };
      });
  });
};

export const TOGGLE_CAMPAIGN_TEXT = 'TOGGLE_CAMPAIGN_TEXT';

export const toggleCampaignText = id => ({
  type: TOGGLE_CAMPAIGN_TEXT,
  payload: id
});

export const [
  POST_COMMENT_START,
  POST_COMMENT_ERROR,
  POST_COMMENT_SUCCESS,
  REFETCH_ALL_COMMENTS
] = ['POST_COMMENT_START', 'POST_COMMENT_ERROR', 'POST_COMMENT_SUCCESS'];

export const commentOnCampaign = (id, body) => dispatch => {
  dispatch({ type: POST_COMMENT_START });

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .post(`${seturl}comments/${id}`, {
        comment_body: body
      })
      .then(res => {
        console.log('res', res);
        dispatch({ type: POST_COMMENT_SUCCESS, payload: res.data.data });
        return aaxios.get(`${seturl}comments/${id}`);
      })
      .catch(err => {
        console.log(err);
        dispatch({ type: POST_COMMENT_ERROR, payload: err });
      });
  });
};

export const [
  DELETE_COMMENT_START,
  DELETE_COMMENT_ERROR,
  DELETE_COMMENT_SUCCESS
] = ['DELETE_COMMENT_START', 'DELETE_COMMENT_ERROR', 'DELETE_COMMENT_SUCCESS'];

export const deleteComment = id => dispatch => {
  dispatch({ type: DELETE_COMMENT_START });

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .delete(`${seturl}comments/com/${id}`)
      .then(res => {
        dispatch({ type: DELETE_COMMENT_SUCCESS, payload: res.data.data });
      })
      .catch(err => {
        dispatch({ type: DELETE_COMMENT_ERROR, payload: err });
        return err;
      });
  });
};

export const addLike = (id, userId) => dispatch => {
  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .post(`${seturl}social/likes/${id}`, { users_id: userId, camp_id: id })
      .then(console.log('word'));
  });
};

export const [
  GET_ORGANIZATIONS_STARTED,
  GET_ORGANIZATIONS_SUCCESS,
  GET_ORGANIZATIONS_ERROR
] = [
  'GET_ORGANIZATIONS_STARTED',
  'GET_ORGANIZATIONS_SUCCESS',
  'GET_ORGANIZATIONS_ERROR'
];

export const getOrganizations = () => dispatch => {
  dispatch({ type: GET_ORGANIZATIONS_STARTED });
  let url = `${seturl}maps`;

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .get(url)
      .then(response => {
        dispatch({ type: GET_ORGANIZATIONS_SUCCESS, payload: response.data });
      })
      .catch(error => {
        dispatch({ type: GET_ORGANIZATIONS_ERROR, payload: error.message });
      });
  });
};

export const [SET_MAP_SEARCH_QUERY] = ['SET_MAP_SEARCH_QUERY'];

export const setMapSearchQuery = (query, field) => dispatch => {
  dispatch({ type: SET_MAP_SEARCH_QUERY, payload: { query, field } });
};

export const [GET_REPORTS_START, GET_REPORTS_SUCCESS, GET_REPORTS_ERROR] = [
  'GET_REPORTS_START',
  'GET_REPORTS_SUCCESS',
  'GET_REPORTS_ERROR'
];

export const [
  ARCHIVE_REPORT_START,
  ARCHIVE_REPORT_SUCCESS,
  ARCHIVE_REPORT_ERROR
] = ['ARCHIVE_REPORT_START', 'ARCHIVE_REPORT_SUCCESS', 'ARCHIVE_REPORT_ERROR'];

export const archiveReport = id => dispatch => {
  dispatch({ type: ARCHIVE_REPORT_START });
  let url = `${seturl}reports/archive/${id}`;

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .post(url)
      .then(res => {
        dispatch({ type: ARCHIVE_REPORT_SUCCESS });
      })
      .catch(err => {
        const error = err.error || err.message;
        console.log(error);
        dispatch({ type: ARCHIVE_REPORT_SUCCESS, payload: error });
      });
  });
};

export const getReports = (
  page = 0,
  type = 'all',
  archive = false
) => dispatch => {
  dispatch({ type: GET_REPORTS_START });
  let url = `${seturl}reports?page=${page}&type=${type}&archive=${archive}`;

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .get(url)
      .then(res => {
        dispatch({ type: GET_REPORTS_SUCCESS, payload: res.data });
      })
      .catch(err => {
        dispatch({ type: GET_REPORTS_ERROR, payload: err.message });
      });
  });
};

export const [GET_REPORT_START, GET_REPORT_SUCCESS, GET_REPORT_ERROR] = [
  'GET_REPORT_START',
  'GET_REPORT_SUCCESS',
  'GET_REPORT_ERROR'
];

export const CLEAR_REPORT_ERROR = 'CLEAR_REPORT_ERROR';

export const clearReportError = () => {
  return { type: CLEAR_REPORT_ERROR };
};

export const getReport = id => dispatch => {
  dispatch({ type: GET_REPORT_START });
  let url = `${seturl}reports/${id}`;

  console.log(`getting report ${id}`);

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .get(url)
      .then(res => {
        dispatch({ type: GET_REPORT_SUCCESS, payload: res?.data });
      })
      .catch(err => {
        console.log(err);
        dispatch({ type: GET_REPORT_ERROR, payload: err.message });
      });
  });
};

export const deactivateUser = id => dispatch => {
  let url = `${seturl}users/deactivate/${id}`;

  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .post(url, {})
      .then(res => {
        console.log('Deactivated successfully');
      })
      .catch(err => {
        console.log(err);
        return err.message;
      });
  });
};

export const createReport = (postType, postId, desc) => dispatch => {
  return axiosWithAuth(dispatch, aaxios => {
    let url = `${seturl}reports`;
    return aaxios
      .post(url, { postType, postId, desc })
      .then(res => {
        console.log('Report Successful');
      })
      .catch(err => {
        console.log(err);
        return err.message;
      });
  });
};

export const getConnections = id => dispatch => {
  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .get(`${seturl}users/connect/${id}`)
      .then(res => {
        return res.data;
      })
      .catch(err => {
        return err.message;
      });
  });
};

export const connectRequest = connected_id => dispatch => {
  return axiosWithAuth(dispatch, aaxios => {
    let url = `${seturl}users/connect/${connected_id}`;
    return aaxios
      .post(url)
      .then(res => {})
      .catch(err => {
        return err.message;
      });
  });
};
export const editConnectStatus = (connection_id, status) => dispatch => {
  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .put(`${seturl}users/connect/${connection_id}`, status)
      .then(res => {})
      .catch(err => {
        return err.message;
      });
  });
};

export const deleteConnection = connection_id => dispatch => {
  return axiosWithAuth(dispatch, aaxios => {
    return aaxios
      .delete(`${seturl}users/connect/${connection_id}`)
      .then(res => {})
      .catch(err => {
        console.log(err);
        return err.message;
      });
  });
};
