# <img src="assets/logocarbon.png" alt="CarbonViz logo" width="28" style="vertical-align: middle;"/> Projet DataViz – Empreinte carbone des sites web et des services en ligne

🔗 **Site du projet**  
http://data-visualization-6a59d8.pages.univ-lyon1.fr/

## 🛠️ Technologies utilisées

[![D3.js](https://img.shields.io/badge/D3.js-visualisation-F9A03C?logo=d3.js&logoColor=white&style=flat)](https://d3js.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-language-F7DF1E?logo=javascript&logoColor=black&style=flat)](https://developer.mozilla.org/fr/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-structure-E34F26?logo=html5&logoColor=white&style=flat)](https://developer.mozilla.org/fr/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-style-1572B6?logo=css3&logoColor=white&style=flat)](https://developer.mozilla.org/fr/docs/Web/CSS)
[![Python](https://img.shields.io/badge/Python-data-3776AB?logo=python&logoColor=white&style=flat)](https://docs.python.org/3/)
[![WebsiteCarbon](https://img.shields.io/badge/WebsiteCarbon-API-2ECC71?style=flat)](https://www.websitecarbon.com/)

**Contexte** : Projet réalisé dans le cadre du cours *Data Visualization*

---

## 1. Contexte et problématique

Le web fait aujourd’hui partie de notre quotidien, mais son impact environnemental reste encore peu visible. Avec l’augmentation du streaming, des réseaux sociaux, du commerce en ligne ou encore des moteurs de recherche, la consommation énergétique du numérique ne cesse de croître.

Chaque site web n’a pourtant pas le même impact. Celui-ci dépend notamment de la taille des pages, de leur catégorie, du pays d’hébergement ou encore du type d’énergie utilisé par les serveurs. Malgré cela, il est souvent difficile pour les utilisateurs,comme pour les développeurs, de comparer ces impacts ou de comprendre ce qui rend une page plus ou moins durable.

L’objectif de ce projet est donc de **rendre visible et compréhensible l’empreinte carbone du web** à travers des visualisations interactives. Celles-ci permettent à la fois d’identifier les sites les plus polluants, de mieux comprendre les facteurs techniques en jeu et de mettre en évidence ce qui caractérise une page web plus respectueuse de l’environnement.

---

## 2. Questions auxquelles nous cherchons à répondre

À travers nos visualisations, nous nous sommes intéressés aux questions suivantes :

- Quels sont les sites web (et moteurs de recherche) les plus polluants ?
- Quel est l’impact carbone d’une page web ?
- Qu’est-ce qu’une page web durable ?
- Quelles catégories de sites génèrent le plus d’émissions ?
- Quel est le site le plus polluant dans chaque pays de notre dataset ?
- Les sites hébergés sur des serveurs « verts » polluent-ils réellement moins ?

---

## 3. Public visé et usages

### Public ciblé
Ce projet s’adresse principalement :
- aux étudiants et enseignants,
- aux développeurs et designers sensibles aux questions d’éco-conception,
- aux personnes travaillant dans les domaines du numérique ou de l’environnement,
- ainsi qu’au grand public souhaitant mieux comprendre l’impact du numérique.

### Ce que permettent les visualisations
Les visualisations proposées permettent notamment de :
- comparer l’empreinte carbone de plusieurs sites web,
- observer quelles catégories sont les plus énergivores,
- identifier le site le plus polluant pour chaque pays,
- comprendre les facteurs techniques responsables des émissions,
- mieux cerner ce qui caractérise une page web durable.

---

## 4. Données utilisées

### Données collectées par nos soins
Une partie des données a été collectée à l’aide d’un script Python. Elles comprennent :
- la taille estimée des pages web,
- la catégorie du site (Streaming, News, Social Media, etc.),
- le pays associé au site,
- le type d’hébergement (vert ou non).

### Données issues de l’API WebsiteCarbon
Nous avons également utilisé l’API WebsiteCarbon pour obtenir :
- l’énergie consommée par visite (en kWh),
- les émissions de CO₂ (en grammes),
- des indicateurs liés à l’énergie renouvelable,
- le score `cleaner_than`.

### Gestion des cas particuliers
En cas de site inaccessible ou de données manquantes, nous avons prévu :
- le remplacement du site par un équivalent,
- l’utilisation de valeurs moyennes issues de l’API,
- ou l’ajout de nouveaux sites via HTTP Archive si nécessaire.

---

## 5. Travaux existants et positionnement du projet

Plusieurs outils et travaux existants ont inspiré ce projet :

### WebsiteCarbon  
https://www.websitecarbon.com/  
WebsiteCarbon fournit une estimation fiable des émissions carbone d’un site web. Cependant, l’analyse se fait site par site. Notre projet va plus loin en proposant des comparaisons entre plusieurs sites à l’aide de visualisations interactives.

### EcoIndex / GreenIT  
https://www.ecoindex.fr/  
EcoIndex propose un cadre de référence intéressant pour évaluer la durabilité d’une page web à partir de différents indicateurs techniques. Néanmoins, ces indicateurs sont présentés séparément. Nos visualisations permettent de les relier directement à l’impact carbone.

### HTTP Archive – State of the Web  
https://httparchive.org/reports/state-of-the-web  
HTTP Archive offre un contexte global sur les tendances du web (poids des pages, performances). En revanche, il ne fournit pas de données carbone. Notre projet complète ces analyses en intégrant les émissions de CO₂ et une lecture par pays et par catégories.

---

## 6. Organisation du projet

Le projet a été mené par une équipe de trois personnes selon une organisation collaborative. Les échanges se sont principalement faits via Discord, tandis que le code, les données, les visualisations et la documentation ont été centralisés sur GitHub.

Nous avons adopté une approche itérative, avec des réunions régulières pour faire le point sur l’avancement du projet. Chaque membre a participé à l’ensemble des étapes, tout en jouant un rôle de référent sur certaines phases clés (collecte des données, analyse et visualisation, intégration et cohérence UX/UI).

---

## 7. Visualisations réalisées

### Bar chart – Sites les plus polluants
Cette visualisation permet de comparer les émissions de CO₂ par site. Des filtres sont disponibles pour explorer les résultats par catégorie, par pays ou selon le type d’hébergement.

### Scatter plot – Taille des pages et émissions de CO₂
Le scatter plot met en relation la taille des pages web et leurs émissions de CO₂. Il permet d’analyser les tendances globales et de comparer les comportements selon les catégories de sites.

### Carte du monde – Site le plus polluant par pays
Cette carte identifie, pour chaque pays, le site le plus polluant présent dans notre dataset. Elle met en évidence des différences géographiques dans l’impact environnemental du web.

### Radar chart – Profil de durabilité
Le radar chart permet de comparer jusqu’à quatre sites simultanément selon plusieurs indicateurs : taille de la page, énergie consommée, émissions de CO2 et manque de perf. env.

---

## 8. Technologies utilisées

- D3.js pour l’ensemble des visualisations interactives
- HTML, CSS et JavaScript pour l’interface web
- Python pour la collecte et le traitement des données
- API WebsiteCarbon

---

## 9. Lancement du projet en local
```bash
python -m http.server 8000
```
Après avoir exécuté cette commande, ouvrez votre navigateur web et saisissez http://localhost:8000
dans la barre d’adresse.

## 10. Conclusion

À travers ce projet, nous proposons une lecture visuelle et pédagogique de l’empreinte carbone du web. Les visualisations montrent clairement que la pollution numérique dépend en grande partie de choix techniques et de conception, et permettent de mieux comprendre ce qui distingue une page web durable d’une page plus polluante.
