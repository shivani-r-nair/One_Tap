// ================================
// One Tap - Registration
// Location + Backend Connection
// ================================


// ================================
// LOCATION ELEMENTS
// ================================

const getLocationButton =
    document.getElementById("getLocationButton");

const locationStatus =
    document.getElementById("locationStatus");

const latitudeInput =
    document.getElementById("latitude");

const longitudeInput =
    document.getElementById("longitude");

const displayLatitude =
    document.getElementById("displayLatitude");

const displayLongitude =
    document.getElementById("displayLongitude");


// ================================
// DETECT USER LOCATION
// ================================

getLocationButton.addEventListener("click", function () {

    if (!navigator.geolocation) {

        locationStatus.textContent =
            "Location services are not supported by this browser.";

        return;
    }


    locationStatus.textContent =
        "Detecting your location...";

    getLocationButton.disabled = true;

    getLocationButton.textContent =
        "Detecting Location...";


    navigator.geolocation.getCurrentPosition(

        // ================================
        // SUCCESS
        // ================================

        function (position) {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            // Store coordinates
            latitudeInput.value = latitude;
            longitudeInput.value = longitude;


            // Display coordinates
            displayLatitude.textContent =
                latitude.toFixed(6);

            displayLongitude.textContent =
                longitude.toFixed(6);


            locationStatus.textContent =
                "✓ Location detected successfully.";


            getLocationButton.textContent =
                "✓ Location Detected";

            getLocationButton.disabled = false;
        },


        // ================================
        // ERROR
        // ================================

        function (error) {

            getLocationButton.disabled = false;

            getLocationButton.textContent =
                "📍 Detect My Location";


            switch (error.code) {

                case error.PERMISSION_DENIED:

                    locationStatus.textContent =
                        "Location permission was denied. Please allow location access.";

                    break;


                case error.POSITION_UNAVAILABLE:

                    locationStatus.textContent =
                        "Your location could not be determined.";

                    break;


                case error.TIMEOUT:

                    locationStatus.textContent =
                        "Location request timed out. Please try again.";

                    break;


                default:

                    locationStatus.textContent =
                        "Unable to detect your location.";

                    break;
            }
        },


        // ================================
        // LOCATION OPTIONS
        // ================================

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
});


// ================================
// REGISTRATION FORM
// ================================

const registerForm =
    document.getElementById("registerForm");


if (registerForm) {

    registerForm.addEventListener("submit", async function (event) {

        // Prevent normal page reload
        event.preventDefault();


        // Get all form values
        const formData =
            new FormData(registerForm);


        try {

            const response =
                await fetch(
                    "http://localhost:8080/one_tap/register",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const result =
                await response.text();


            if (response.ok) {

                alert(result);

                // Go to login page after successful registration
                window.location.href =
                    "login.html";

            } else {

                alert(
                    "Registration failed:\n" +
                    result
                );
            }


        } catch (error) {

            console.error(error);

            alert(
                "Could not connect to the One Tap backend.\n\n" +
                "Make sure the Java backend is running."
            );
        }
    });
}