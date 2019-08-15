import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Button,
  TouchableOpacity
} from 'react-native';
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from 'react-native-popup-menu';
import SvgUri from 'react-native-svg-uri';
import { ScrollView } from "react-navigation";
import { connect } from 'react-redux';

import { Icon, ListItem } from 'react-native-elements';

import { getProfileData, deleteCampaign, getCampaign } from '../store/actions';

import EditButton from '../components/EditButton';

import ProfileHeader from '../components/Profile/ProfileHeader';
import Stylesheet from '../constants/Stylesheet';

class MyProScreen extends React.Component {
  static navigationOptions = ({ navigation }) => {
    return {
      title: 'My Profile',
      headerStyle: {
        backgroundColor: '#323338'
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        textAlign: 'center',
        flexGrow: 1,
        alignSelf: 'center',
        fontFamily: 'OpenSans-SemiBold',
      },
      headerLeft: <View />,
      headerRight: <EditButton navigation={navigation} editRoute={'EditPro'} />
    };
  };

  componentDidMount() {
    this.props.getProfileData(this.props.currentUserProfile.id, false, 'myProfile');
  }

  goToCampaign = async (id) => {
    await this.props.getCampaign(id);
    this.props.navigation.navigate('Camp');
  };

  goToEditCampaign = async (id) => {
    await this.props.getCampaign(id)
    this.props.navigation.navigate('EditCamp') 
  }

  render() {
    return (
      <ScrollView>
        <ProfileHeader
          navigation={this.props.navigation}
          myProfile={true}
          profile={this.props.currentUserProfile}
        />
        <View />
        <View>
          {this.props.currentUserProfile.campaigns &&
            this.props.currentUserProfile.campaigns.map(camp => {
              return (
                <ListItem
                  onPress={() => this.goToCampaign(camp.camp_id)}
                  key={camp.camp_id}
                  title={camp.camp_name}
                  leftAvatar={{ source: { uri: camp.camp_img } }}
                  subtitle={camp.location}
                  rightIcon={
                    <Menu>
                      <MenuTrigger children={<SvgUri width='25' height='25' source={require('../assets/icons/ellipsis-vertical.svg')} />}/>
                      <MenuOptions customStyles={optionsStyles}>
                        <MenuOption onSelect={() => this.goToEditCampaign(camp.camp_id)}>
                          <Text style={{color: '#ff0a55',fontSize: 16 }}>Edit</Text>
                        </MenuOption>
                        <MenuOption onSelect={() => this.props.deleteCampaign(campaign.camp_id)}>
                          <Text style={{color: '#ff0a55',fontSize: 16 }}>Delete</Text>
                        </MenuOption>
                      </MenuOptions>
                    </Menu>
                  }
                />
              );
            })}
        </View>
      </ScrollView>
    );
  }
}

const mapStateToProps = state => ({
  currentUserProfile: state.currentUserProfile
});
const optionsStyles = {
  optionsContainer: {
    width: 150
    
  },
}

export default connect(
  mapStateToProps,
  { getProfileData, deleteCampaign, getCampaign }
)(MyProScreen);
