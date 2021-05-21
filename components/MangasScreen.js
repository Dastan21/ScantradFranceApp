import React, { useEffect, useState } from 'react';
import {
	View,
	Image,
	RefreshControl,
	Text,
	FlatList,
	TouchableHighlight,
	TouchableOpacity
} from 'react-native';
import BackgroundImage from './BackgroundImage';
import LoadingScreen from './LoadingScreen';
import BannerHeader from './BannerHeader';
import styles from "../assets/styles/styles";
import secrets from '../config/secrets';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notifications } from "expo/build/deprecated.web";
import { get, post } from 'axios';

const MangaScreen = ({navigation}) => {

	const [isLoadingMangas, setLoadingMangas] = useState(true);
	const [mangas, setMangas] = useState([]);
	const [refreshing, setRefreshing] = useState(false);
	const [follows, setFollows] = useState([]);

	const getMangas = () => {
		return get(secrets.sf_api.url + "mangas/", { headers: { Authorization: `Bearer ${secrets.sf_api.token}` } }).then(res => res.data).catch(console.error);
	};
	const loadMangas = () => {
		getMangas().then(mangas => {
			setLoadingMangas(false);
			setMangas(mangas);
		}).catch(err => {
			console.error(err);
			setLoadingMangas(false);
		});
	}
	const wait = timeout => {
		return new Promise(resolve => {
			setTimeout(resolve, timeout);
		});
	}
	const onRefresh = () => {
		setRefreshing(true);
		wait(2000).then(() => {
			setLoadingMangas(true);
			loadMangas();
			setRefreshing(false);
		});
	};

	const loadFollows = () => {
		try {
			AsyncStorage.getItem('follows').then(f => JSON.parse(f || "[]")).then((follows) => {
				setFollows(follows);
			}).catch(console.error);
		} catch (err) { console.error(err); }
	};

	const saveFollows = async manga_id => {
		try {
			let fol = JSON.parse((await AsyncStorage.getItem('follows')) || "[]");
			fol = fol.filter(f => f !== manga_id);
			if (!follows.includes(manga_id)) fol.push(manga_id);
			fol = fol.filter(f => typeof f === "string");
			await AsyncStorage.setItem('follows', JSON.stringify(fol));
			Notifications.getExpoPushTokenAsync().then(token => {
				setFollows(fol);
				post(secrets.sf_api.url + "users/follows", {
					token: token,
					follows: JSON.stringify(fol)
				}, {
					headers: { Authorization: `Bearer ${secrets.sf_api.token}` }
				}).catch(console.error);
			}).catch(console.error);
		} catch (err) { console.error(err); }
	}

	useEffect(() => {
		Image.resolveAssetSource({ uri: '../assets/img/bookmark_filled.png' });
		Image.resolveAssetSource({ uri: '../assets/img/bookmark.png' });

		loadFollows();
		loadMangas();
	}, []);	

	if (isLoadingMangas)
		return (<LoadingScreen />);
	if (!mangas.length)
		return (
			<View>
				<Text>
					Une erreur s'est produite lors du chargement des mangas...
				</Text>
			</View>
		);
	return (
		<BackgroundImage>
			<FlatList
				style={styles.listChapters}
				data={mangas}
				renderItem={({ item }) => <ThumbnailManga navigation={navigation} manga={item} isFollowing={follows.includes(item.id)} saveFollows={saveFollows} />}
				keyExtractor={item => item.id}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
				ListHeaderComponent={BannerHeader}
			/>
		</BackgroundImage>
	);
}

const ThumbnailManga = ({ navigation, manga, isFollowing, saveFollows }) => {

	const [followed, setFollowed] = useState(isFollowing);

	const changeFollowed = () => {
		setFollowed(!followed);
		saveFollows(manga.id);
	}

	const sliceText = (text, max) => {
		if (text.length <= max) return [text, ""];
		let t = text.split(' ');
		let n = 0, i = 0; while (i < t.length && n <= max) { n += t[i].length+1; i++; }
		return [t.slice(0, i-1).join(' '), t.slice(i-1).join(' ')];
	};

	return (
		<View style={styles.item}>
			<TouchableHighlight style={styles.chapterPreviewFullContainer} onPress={() => navigation.navigate('Manga', { manga: manga })}>
				<View>
					<Text>
						<View style={styles.chapterPreviewContainer}>
							<View>
								<Image style={styles.chapterPreviewThumbnail} source={{ uri: manga.thumbnail }} fadeDuration={0} />
								<View style={styles.chapterPreviewThumbnailBorder} />
							</View>
						</View>
						<View style={styles.chapterPreviewContainer}>
							<View style={{ flexWrap: 'nowrap' }}>
								<Text style={[styles.text, styles.mangaPreviewName]}>{sliceText(manga.name, 24)[0]}</Text>
								<Text style={[styles.text, styles.mangaPreviewName]}>{sliceText(manga.name, 24)[1]}</Text>
							</View>
						</View>
					</Text>
					{ manga.last_chapter ?
						<Text style={[styles.text, styles.chapterPreviewDate]}>{manga.last_chapter}</Text>
					: null }
				</View>
			</TouchableHighlight>
			<TouchableOpacity style={styles.chapterPreviewBookmarkContainer} onPress={changeFollowed} activeOpacity={0.6}>
				<View style={styles.chapterPreviewBookmarkPressable}>
					<Image style={styles.chapterPreviewBookmarkIcon} source={followed ? require('../assets/img/bookmark_filled.png') : require('../assets/img/bookmark.png')} />
				</View>
			</TouchableOpacity>
		</View>
	);
};


module.exports = MangaScreen;