import { USE_RECOMMENDATIONSTORE } from '~/stores/recommendation'

export function loadcontent() {

    const recommendations = USE_RECOMMENDATIONSTORE()

    recommendations.loadContentFromAPI(recommendations.recommendations)

}