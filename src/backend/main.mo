import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type Station = {
    id : Text;
    name : Text;
    streamUrl : Text;
    genre : Text;
    tags : Text;
    favicon : Text;
  };

  public type UserProfile = {
    name : Text;
  };

  let userFavorites = Map.empty<Principal, List.List<Station>>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func addFavorite(station : Station) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add favorites");
    };

    let favorites = switch (userFavorites.get(caller)) {
      case (null) {
        let newList = List.empty<Station>();
        newList.add(station);
        newList;
      };
      case (?existingList) {
        let filtered = existingList.filter(func(s) { s.id != station.id });
        filtered.add(station);
        filtered;
      };
    };
    userFavorites.add(caller, favorites);
  };

  public shared ({ caller }) func removeFavorite(stationId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove favorites");
    };

    switch (userFavorites.get(caller)) {
      case (null) { () };
      case (?favorites) {
        let filtered = favorites.filter(func(station) { station.id != stationId });
        userFavorites.add(caller, filtered);
      };
    };
  };

  public query ({ caller }) func getFavorites() : async [Station] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access favorites");
    };
    switch (userFavorites.get(caller)) {
      case (null) { [] };
      case (?favorites) { favorites.toArray() };
    };
  };
};
